import Foundation
import Observation

/// Where the app is: the selected tab, each tab's navigation stack, and the
/// log sheet. Screens read `dataVersion` in `.task(id:)` to reload after any
/// save or delete, so a screen you come back to is never stale.
@MainActor @Observable
final class AppRouter {
  enum Tab { case home, profile }

  /// What the entry screen says on arrival.
  enum Notice: Hashable { case saved, planned, photoFailed }

  enum Route: Hashable {
    case entry(UUID, notice: Notice? = nil)
    case trip(UUID)
  }

  /// The log sheet: a new entry, or editing one.
  struct LogRequest: Identifiable {
    let id = UUID()
    var editing: Entry?
  }

  var tab = Tab.home
  var homePath: [Route] = []
  var profilePath: [Route] = []
  var log: LogRequest?
  private(set) var dataVersion = 0

  func startLog() { log = LogRequest() }

  func edit(_ entry: Entry) { log = LogRequest(editing: entry) }

  /// After a save: a new entry opens on the Profile tab, where the entry
  /// screen offers sharing; an edit returns to the entry it came from.
  func saved(_ id: UUID, isNew: Bool, planned: Bool, photoFailed: Bool) {
    log = nil
    dataChanged()
    guard isNew || photoFailed else { return }
    let notice: Notice = photoFailed ? .photoFailed : planned ? .planned : .saved
    if isNew {
      tab = .profile
      profilePath = [.entry(id, notice: notice)]
    } else if let index = path(for: tab).lastIndex(where: { if case .entry(id, _) = $0 { true } else { false } }) {
      var stack = path(for: tab)
      stack[index] = .entry(id, notice: notice)
      setPath(stack, for: tab)
    }
  }

  /// Something was written or deleted: screens reload.
  func dataChanged() { dataVersion += 1 }

  private func path(for tab: Tab) -> [Route] { tab == .home ? homePath : profilePath }

  private func setPath(_ path: [Route], for tab: Tab) {
    if tab == .home { homePath = path } else { profilePath = path }
  }
}
