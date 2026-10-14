import Foundation
import Supabase

/// Profile photos live in the public `avatars` bucket at
/// `{user_id}/{timestamp}.jpg`: a new name per upload, so caches never serve
/// an old photo. Same as apps/web/src/lib/avatar.ts.
enum Avatars {
  static let bucket = "avatars"

  /// Uploads a photo (re-encoded square to 512px first) and points the
  /// profile at it, deleting the old file. Returns the new public URL.
  static func save(_ photo: Data, userId: UUID, replacing old: URL?) async throws -> URL {
    let jpeg = try Photo.jpeg(from: photo, maxEdge: Photo.avatarEdge, square: true)
    let path = "\(userId.uuidString.lowercased())/\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
    let storage = supabase.storage.from(bucket)
    try await storage.upload(path, data: jpeg, options: FileOptions(cacheControl: "31536000", contentType: "image/jpeg"))
    let url = try storage.getPublicURL(path: path)
    do {
      try await setProfileAvatar(url, userId: userId, replacing: old)
    } catch {
      _ = try? await storage.remove(paths: [path])
      throw error
    }
    return url
  }

  /// Clears the profile photo and deletes the file.
  static func remove(userId: UUID, current: URL?) async throws {
    try await setProfileAvatar(nil, userId: userId, replacing: current)
  }

  private static func setProfileAvatar(_ url: URL?, userId: UUID, replacing old: URL?) async throws {
    struct Update: Encodable { let avatar_url: String? }
    try await supabase.from("profiles")
      .update(Update(avatar_url: url?.absoluteString))
      .eq("id", value: userId)
      .execute()
    // The profile no longer points at the old file, so delete it.
    if let path = ownPath(old, userId: userId) {
      _ = try? await supabase.storage.from(bucket).remove(paths: [path])
    }
  }

  /// The path of a file in our bucket from its public URL, when it's this
  /// user's; nil for anything else.
  static func ownPath(_ url: URL?, userId: UUID) -> String? {
    let marker = "/storage/v1/object/public/\(bucket)/"
    guard let string = url?.absoluteString, let range = string.range(of: marker) else { return nil }
    let tail = string[range.upperBound...].split(separator: "?").first.map(String.init) ?? ""
    let path = tail.removingPercentEncoding ?? tail
    return path.hasPrefix("\(userId.uuidString.lowercased())/") ? path : nil
  }

  /// The Google profile photo from sign-in, at 512px square. Only Google's
  /// own image host, so this never fetches an arbitrary URL.
  static func googlePhotoURL(_ metadata: [String: AnyJSON]) -> URL? {
    let raw = metadata["avatar_url"]?.stringValue ?? metadata["picture"]?.stringValue
    guard
      let raw, let url = URL(string: raw), url.scheme == "https",
      let host = url.host(), host.hasSuffix(".googleusercontent.com")
    else { return nil }
    let base = raw.replacingOccurrences(of: "=[a-zA-Z0-9-]+$", with: "", options: .regularExpression)
    return URL(string: "\(base)=s512-c")
  }

  /// On first sign-in with Google, copies the Google photo into our bucket,
  /// as the web's sign-in callback does (the app skips that callback). Only
  /// with no handle and no avatar yet, so it never overrides a choice.
  /// Never throws: onboarding carries on without a photo.
  static func importGooglePhoto(for user: User) async -> URL? {
    guard let source = googlePhotoURL(user.userMetadata) else { return nil }
    do {
      struct Row: Decodable { let handle: String?; let avatar_url: String? }
      let row: Row = try await supabase.from("profiles")
        .select("handle, avatar_url").eq("id", value: user.id).single().execute().value
      guard row.handle == nil, row.avatar_url == nil else { return nil }
      var request = URLRequest(url: source, timeoutInterval: 5)
      request.setValue("image/jpeg", forHTTPHeaderField: "Accept")
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200, !data.isEmpty, data.count <= 2 * 1024 * 1024 else {
        return nil
      }
      return try await save(data, userId: user.id, replacing: nil)
    } catch {
      Log.data.error("Importing the Google photo failed: \(error.localizedDescription, privacy: .public)")
      return nil
    }
  }
}
