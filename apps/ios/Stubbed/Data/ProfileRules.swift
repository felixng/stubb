import Foundation

/// The profile field rules from the web (apps/web/src/lib/profile-handle.ts).
/// Postgres checks the same, so these only give early, friendly messages.
/// Reserved handles are asked of Postgres (`is_reserved_handle`), so the
/// list lives in one place.
enum ProfileRules {
  static let nameMax = 50
  static let bioMax = 160
  static let linkMax = 200

  /// "@Felix.Ng " → "felixng". People paste handles from Instagram.
  static func normalizeHandle(_ value: String) -> String {
    var handle = value.trimmingCharacters(in: .whitespacesAndNewlines)
    if handle.hasPrefix("@") { handle.removeFirst() }
    return String(handle.lowercased().filter { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "_") })
  }

  /// The format problem with a handle, if any. Reserved and taken handles
  /// are checked against the database.
  static func handleProblem(_ handle: String) -> String? {
    if handle.isEmpty { return "Pick a handle." }
    if handle.count < 3 { return "At least 3 characters." }
    if handle.count > 20 { return "At most 20 characters." }
    if handle != normalizeHandle(handle) { return "Letters, numbers and underscores only." }
    return nil
  }

  /// "instagram.com/you" → "https://instagram.com/you"; nil when it isn't a
  /// usable http(s) link.
  static func normalizeLink(_ value: String) -> String? {
    let raw = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !raw.isEmpty, !raw.contains(where: \.isWhitespace) else { return nil }
    let hasScheme = raw.range(of: "^[a-zA-Z][a-zA-Z0-9+.-]*:", options: .regularExpression) != nil
    let link = hasScheme ? raw : "https://\(raw)"
    guard
      let url = URL(string: link),
      let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http",
      let host = url.host(), host.contains("."),
      link.count <= linkMax
    else { return nil }
    return link
  }

  /// Postgres's refusal of a reserved handle (the profiles trigger).
  static func isReservedError(_ error: any Error) -> Bool {
    let text = String(describing: error)
    return text.contains("23514") && text.localizedCaseInsensitiveContains("reserved")
  }

  /// A unique-constraint failure: someone took the handle in the meantime.
  static func isTakenError(_ error: any Error) -> Bool {
    String(describing: error).contains("23505")
  }
}
