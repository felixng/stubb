import SwiftUI

/// A public show, like the web's /e/:id: the post, its comments (#75), and
/// "More from @handle".
struct PublicEntryView: View {
  let id: UUID
  var showComments = false

  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router
  @State private var state: Loadable<PublicPages.EntryPage?> = .loading

  var body: some View {
    Screen(title: "") {
      switch state {
      case .loading:
        LoadingText()
      case .failed(let message):
        EmptyState(title: "Couldn’t load this show") { Text(message) }
      case .loaded(nil):
        EmptyState(title: "This show isn’t available") {
          Text("It may be private, or it may have been deleted.")
        }
      case .loaded(let page?):
        PostCard(
          entry: page.entry, owner: page.owner, photo: page.photo, mine: page.entry.userId == session.userId,
          linkTrips: !page.owner.isPrivate || page.entry.userId == session.userId, reactions: page.reactions)
        CommentThread(entryId: page.entry.id, ownerId: page.owner.id, focus: showComments)
        NavigationLink("More from @\(page.owner.handle)", value: AppRouter.Route.profile(handle: page.owner.handle))
          .buttonStyle(.tintedPill)
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .refreshable { await load() }
    .task(id: router.dataVersion) { await load() }
  }

  private func load() async {
    do {
      state = .loaded(try await PublicPages.entry(id))
    } catch {
      if state.value == nil { state = .failed("Check your connection and try again.") }
    }
  }
}

/// The comment thread: built in #75.
struct CommentThread: View {
  let entryId: UUID
  let ownerId: UUID
  var focus = false
  var body: some View { EmptyView() }
}
