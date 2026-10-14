import Foundation
import Supabase

/// A profile as the app shows it: handle, name, bio, link, photo, privacy.
struct Profile: Decodable, Hashable, Identifiable, Sendable {
  let id: UUID
  let handle: String
  let displayName: String?
  let bio: String?
  let link: String?
  let avatarURL: URL?
  let isPrivate: Bool

  enum CodingKeys: String, CodingKey {
    case id, handle, bio, link
    case displayName = "display_name"
    case avatarURL = "avatar_url"
    case isPrivate = "is_private"
  }

  static let select = "id, handle, display_name, bio, link, avatar_url, is_private"

  init(from decoder: any Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    handle = try c.decodeIfPresent(String.self, forKey: .handle) ?? ""
    displayName = try c.decodeIfPresent(String.self, forKey: .displayName)
    bio = try c.decodeIfPresent(String.self, forKey: .bio)
    link = try c.decodeIfPresent(String.self, forKey: .link)
    avatarURL = try c.decodeIfPresent(String.self, forKey: .avatarURL).flatMap(URL.init(string:))
    isPrivate = try c.decodeIfPresent(Bool.self, forKey: .isPrivate) ?? false
  }

  /// The name to show: the display name, else "@handle".
  var name: String { displayName.flatMap { $0.isEmpty ? nil : $0 } ?? "@\(handle)" }
}

struct FollowCounts: Decodable, Hashable, Sendable {
  var followers = 0
  var following = 0
}

enum Profiles {
  static func profile(_ id: UUID) async throws -> Profile {
    try await supabase.from("profiles").select(Profile.select).eq("id", value: id).single().execute().value
  }

  static func followCounts(_ id: UUID) async -> FollowCounts {
    (try? await supabase.rpc("follow_counts", params: ["profile_id": id]).single().execute().value) ?? FollowCounts()
  }

  /// Shows you've been to (planned ones aren't counted).
  static func loggedCount(_ userId: UUID) async -> Int {
    (try? await supabase.from("entries").select("id", head: true, count: .exact)
      .eq("user_id", value: userId).eq("status", value: "logged").execute().count) ?? 0
  }

  /// Your entries, newest first, with signed photo URLs.
  static func ownEntries(_ userId: UUID) async throws -> (entries: [Entry], photos: [String: URL]) {
    let entries: [Entry] = try await supabase.from("entries").select(Entry.select).eq("user_id", value: userId)
      .order("date", ascending: false).order("created_at", ascending: false).execute().value
    return (entries, await Entries.signPhotos(entries.map(\.photoPath)))
  }
}
