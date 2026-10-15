import SwiftUI

/// Home: the feed. Your shows and the shows of people you follow, newest
/// first, a page at a time. Your diary lives on the Profile tab.
struct HomeView: View {
  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router

  @State private var items: [FeedItem] = []
  @State private var next: Feed.Cursor?
  @State private var following = 0
  @State private var state = State.loading
  @State private var loadingMore = false
  @State private var moreFailed = false

  enum State { case loading, loaded, failed }

  var body: some View {
    Screen(title: "Home") {
      if following == 0, state == .loaded {
        VStack(alignment: .leading, spacing: Space.m) {
          VStack(alignment: .leading, spacing: Space.xs) {
            Text("Follow people you go to the theatre with")
              .font(.stubHeadline)
              .foregroundStyle(Palette.label)
            Text("Their shows appear here next to yours.")
              .font(.stubSubheadline)
              .foregroundStyle(Palette.labelSecondary)
          }
          NavigationLink("Find people", value: AppRouter.Route.people)
            .buttonStyle(.tintedPill)
        }
        .padding(Space.l)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
      }

      switch state {
      case .loading:
        LoadingText()
      case .failed:
        EmptyState(title: "Couldn’t load your feed") { Text("Check your connection and open Home again.") }
      case .loaded where items.isEmpty:
        EmptyState(title: "Nothing here yet") {
          Button("Track a show") { router.startLog() }
            .font(.stubSubheadline.weight(.semibold))
            .foregroundStyle(Palette.tintText)
          Text("and it appears here, along with shows from people you follow.")
        }
      case .loaded:
        LazyVStack(spacing: Space.xl) {
          ForEach(items) { item in
            PostCard(
              entry: item.entry, owner: item.owner, photo: item.photo, mine: item.mine,
              // A private profile's trip pages don't open for others.
              linkTrips: item.mine || !item.owner.isPrivate, reactions: item.reactions)
          }
          if next != nil {
            Group {
              if moreFailed {
                Button("Couldn’t load more. Try again") { Task { await loadMore() } }
                  .font(.stubSubheadline.weight(.semibold))
                  .foregroundStyle(Palette.tintText)
              } else {
                ProgressView().onAppear { Task { await loadMore() } }
              }
            }
            .frame(maxWidth: .infinity, minHeight: Space.touch)
          }
        }
      }
    }
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        NavigationLink(value: AppRouter.Route.people) {
          Label("Find people", systemImage: "person.badge.plus")
        }
      }
    }
    .refreshable { await load() }
    // Logging a show starts the feed over from the top.
    .task(id: router.dataVersion) { await load() }
  }

  private func load() async {
    guard let userId = session.userId else { return }
    async let page = Feed.page(after: nil, userId: userId)
    async let count = Feed.followingCount(userId)
    do {
      let first = try await page
      items = first.items
      next = first.next
      moreFailed = false
      state = .loaded
    } catch {
      if items.isEmpty { state = .failed }
    }
    following = await count
  }

  private func loadMore() async {
    guard let userId = session.userId, let cursor = next, !loadingMore else { return }
    loadingMore = true
    defer { loadingMore = false }
    do {
      let page = try await Feed.page(after: cursor, userId: userId)
      let seen = Set(items.map(\.id))
      items += page.items.filter { !seen.contains($0.id) }
      next = page.next
      moreFailed = false
    } catch {
      moreFailed = true
    }
  }
}
