import Foundation
import Supabase

/// Follows (supabase/migrations/20261014160000_follows.sql). Postgres sets
/// the status: following a public profile is accepted at once, a private one
/// sends a request its owner approves. Either side ends a follow by deleting
/// the row.
enum Follows {
  private struct Pair: Encodable {
    let follower_id: UUID
    let followee_id: UUID
  }

  static func follow(_ profileId: UUID, me: UUID) async throws {
    do {
      try await supabase.from("follows").insert(Pair(follower_id: me, followee_id: profileId)).execute()
    } catch where String(describing: error).contains("23505") {
      // A double tap raced into a duplicate: the follow exists, as asked.
    }
  }

  /// Unfollow, or cancel a request.
  static func unfollow(_ profileId: UUID, me: UUID) async throws {
    try await supabase.from("follows").delete().eq("follower_id", value: me).eq("followee_id", value: profileId)
      .execute()
  }

  /// Stop someone following you (or decline their request).
  static func remove(follower: UUID, me: UUID) async throws {
    try await supabase.from("follows").delete().eq("follower_id", value: follower).eq("followee_id", value: me)
      .execute()
  }

  static func approve(_ follower: UUID, me: UUID) async throws {
    struct Status: Encodable { let status = "accepted" }
    try await supabase.from("follows").update(Status()).eq("follower_id", value: follower)
      .eq("followee_id", value: me).execute()
  }

  private struct Row: Decodable { let person: Person? }

  /// A profile's followers or the people it follows, newest first. Accepted
  /// follows only; empty when RLS hides them (check `isVisible` first).
  static func list(_ profileId: UUID, _ list: AppRouter.FollowList) async throws -> [Person] {
    let (mine, theirs) = list == .followers ? ("followee_id", "follower_id") : ("follower_id", "followee_id")
    let rows: [Row] = try await supabase.from("follows")
      .select("person:profiles!follows_\(theirs)_fkey(\(Person.select))")
      .eq(mine, value: profileId).eq("status", value: "accepted")
      .order("created_at", ascending: false).execute().value
    return rows.compactMap(\.person).filter { !$0.handle.isEmpty }
  }

  /// Requests waiting for your approval, oldest first.
  static func requests(_ me: UUID) async throws -> [Person] {
    let rows: [Row] = try await supabase.from("follows")
      .select("person:profiles!follows_follower_id_fkey(\(Person.select))")
      .eq("followee_id", value: me).eq("status", value: "pending")
      .order("created_at", ascending: true).execute().value
    return rows.compactMap(\.person).filter { !$0.handle.isEmpty }
  }

  /// Whether the viewer may see a profile's shows and lists.
  static func isVisible(_ profileId: UUID) async -> Bool {
    (try? await supabase.rpc("profile_is_visible", params: ["profile_id": profileId]).execute().value) ?? false
  }
}
