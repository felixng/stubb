import Foundation
import Supabase

/// Trips: a name and dates, holding only entries dated within them (the
/// database enforces it). A trip has no privacy setting of its own: it's
/// public when it holds a public show.
enum Trips {
  struct Listed: Decodable, Identifiable, Hashable, Sendable {
    let trip: Trip
    let count: Int
    var id: UUID { trip.id }

    private struct Count: Decodable { let count: Int }
    private enum Keys: String, CodingKey { case entry_collections }

    init(from decoder: any Decoder) throws {
      trip = try Trip(from: decoder)
      let c = try decoder.container(keyedBy: Keys.self)
      count = (try c.decodeIfPresent([Count].self, forKey: .entry_collections))?.first?.count ?? 0
    }
  }

  /// Your trips, newest first, with how many shows each holds.
  static func list(_ userId: UUID) async throws -> [Listed] {
    try await supabase.from("collections").select("\(Trip.select), entry_collections(count)")
      .eq("user_id", value: userId).eq("kind", value: "trip")
      .order("start_date", ascending: false).order("created_at", ascending: false)
      .execute().value
  }

  static func trip(_ id: UUID) async throws -> Trip {
    try await supabase.from("collections").select(Trip.select).eq("id", value: id).eq("kind", value: "trip")
      .single().execute().value
  }

  enum SaveError: LocalizedError {
    case showsOutside
    case failed
    var errorDescription: String? {
      switch self {
      case .showsOutside: "Some shows in this trip fall outside these dates. Remove them from the trip first."
      case .failed: "Couldn’t save. Try again."
      }
    }
  }

  /// Creates or updates a trip. A new trip can start with shows in it.
  /// Returns the trip, and whether adding the shows failed.
  static func save(
    editing: Trip?, name: String, start: String, end: String, entryIds: [UUID]
  ) async throws -> (trip: Trip, linksFailed: Bool) {
    struct Fields: Encodable {
      let name: String
      let kind = "trip"
      let start_date: String
      let end_date: String
    }
    let fields = Fields(name: name, start_date: start, end_date: end)
    let trip: Trip
    do {
      if let editing {
        trip = try await supabase.from("collections").update(fields).eq("id", value: editing.id)
          .select(Trip.select).single().execute().value
      } else {
        trip = try await supabase.from("collections").insert(fields).select(Trip.select).single().execute().value
      }
    } catch {
      Log.data.error("Saving the trip failed: \(error.localizedDescription, privacy: .public)")
      throw String(describing: error).contains("23514") ? SaveError.showsOutside : SaveError.failed
    }
    guard editing == nil, !entryIds.isEmpty else { return (trip, false) }
    do {
      try await add(entryIds, to: trip.id)
      return (trip, false)
    } catch {
      return (trip, true)
    }
  }

  static func add(_ entryIds: [UUID], to tripId: UUID) async throws {
    struct Link: Encodable {
      let entry_id: UUID
      let collection_id: UUID
    }
    try await supabase.from("entry_collections")
      .upsert(entryIds.map { Link(entry_id: $0, collection_id: tripId) }, ignoreDuplicates: true).execute()
  }

  static func remove(_ entryIds: [UUID], from tripId: UUID) async throws {
    try await supabase.from("entry_collections").delete().eq("collection_id", value: tripId)
      .in("entry_id", values: entryIds.map(\.uuidString)).execute()
  }

  /// Deletes the trip; its shows stay in the diary.
  static func delete(_ id: UUID) async throws {
    try await supabase.from("collections").delete().eq("id", value: id).execute()
  }
}
