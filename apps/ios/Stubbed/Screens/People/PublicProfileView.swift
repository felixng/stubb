import SwiftUI

/// Someone's profile as everyone sees it (yours too, from "View public
/// profile"), like the web's /@handle: photos from their shows, avatar,
/// handle, name, bio, link, follow counts, stats, then the calendar and
/// their public shows. A private profile shows just its header unless
/// you're an approved follower.
struct PublicProfileView: View {
  let handle: String

  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router
  @State private var state: Loadable<PublicPages.ProfilePage?> = .loading

  var body: some View {
    ScrollViewReader { proxy in
      Screen(title: "@\(handle)") {
        switch state {
        case .loading:
          LoadingText()
        case .failed(let message):
          EmptyState(title: "Couldn’t load this profile") { Text(message) }
        case .loaded(nil):
          EmptyState(title: "No one here") { Text("There’s no profile at @\(handle).") }
        case .loaded(let page?):
          header(page)
          if page.stats == nil {
            EmptyState(title: "This profile is private") { Text(privateMessage(page)) }
          } else if page.entries.isEmpty {
            EmptyState(title: "No public shows yet") {
              Text("When @\(page.profile.handle) tracks a public show, it’ll appear here.")
            }
          } else {
            ProfileCalendar(entries: page.entries.map { .init(id: $0.id, date: $0.date, title: $0.show.title) }) { id in
              withAnimation { proxy.scrollTo(id, anchor: .top) }
            }
            Text("Recent shows")
              .font(.stubTitle2)
              .foregroundStyle(Palette.label)
              .accessibilityAddTraits(.isHeader)
            ForEach(page.entries) { entry in
              PostCard(
                entry: entry, owner: page.profile.person, photo: entry.photoPath.flatMap { page.photos[$0] },
                mine: page.viewer.isOwner, reactions: page.reactions[entry.id] ?? Reactions()
              )
              .id(entry.id)
            }
          }
        }
      }
      .navigationBarTitleDisplayMode(.inline)
    }
    .refreshable { await load() }
    .task(id: router.dataVersion) { await load() }
  }

  private func header(_ page: PublicPages.ProfilePage) -> some View {
    let p = page.profile
    let cover = page.entries.compactMap { $0.photoPath.flatMap { page.photos[$0] } }.prefix(3)
    return VStack(alignment: .leading, spacing: 0) {
      Group {
        if cover.isEmpty {
          Palette.tintFill.frame(height: 80)
        } else {
          HStack(spacing: 2) {
            ForEach(Array(cover), id: \.self) { url in
              AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { Palette.fill }
                .frame(maxWidth: .infinity, maxHeight: 112)
                .clipped()
            }
          }
          .frame(height: 112)
        }
      }
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: Space.l) {
        HStack(alignment: .bottom) {
          Avatar(name: p.name, url: p.avatarURL, size: 88)
            .overlay(Circle().strokeBorder(Palette.surface, lineWidth: 4))
            .padding(.top, -44)
          Spacer()
          FollowButton(profile: p, viewer: page.viewer)
        }
        VStack(alignment: .leading, spacing: 2) {
          Text(verbatim: "@\(p.handle)")
            .font(.stubTitle)
            .foregroundStyle(Palette.label)
            .accessibilityAddTraits(.isHeader)
          if let name = p.displayName, !name.isEmpty {
            Text(name).font(.stubSubheadline).foregroundStyle(Palette.labelSecondary)
          }
        }
        if let bio = p.bio, !bio.isEmpty {
          Text(bio).font(.stubBody).foregroundStyle(Palette.label)
        }
        if let link = p.link, let url = URL(string: link) {
          Link(Self.displayLink(link), destination: url)
            .font(.stubSubheadline.weight(.semibold))
            .foregroundStyle(Palette.tintText)
            .lineLimit(1)
        }
        HStack(spacing: Space.l) {
          NavigationLink(value: AppRouter.Route.follows(handle: p.handle, list: .followers)) {
            count(page.follows.followers, page.follows.followers == 1 ? "follower" : "followers")
          }
          NavigationLink(value: AppRouter.Route.follows(handle: p.handle, list: .following)) {
            count(page.follows.following, "following")
          }
        }
        .buttonStyle(.plain)
        if let stats = page.stats {
          HStack(spacing: Space.xxxl) {
            stat(stats.shows, "Shows")
            stat(stats.venues, "Theatres")
            stat(stats.cities, "Cities")
          }
        }
      }
      .padding(.horizontal, Space.l)
      .padding(.bottom, Space.xl)
    }
    .background(Palette.surface)
    .clipShape(.rect(cornerRadius: Radius.md))
    .overlay(RoundedRectangle(cornerRadius: Radius.md).strokeBorder(Palette.separator))
    .shadow(color: Palette.shadow.opacity(0.08), radius: 1, y: 1)
  }

  private func count(_ value: Int, _ label: String) -> some View {
    (Text("\(value)").fontWeight(.semibold).foregroundStyle(Palette.label)
      + Text(" \(label)").foregroundStyle(Palette.labelSecondary))
      .font(.stubSubheadline)
      .monospacedDigit()
      .frame(minHeight: Space.touch)
  }

  private func stat(_ value: Int, _ label: String) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text("\(value)").font(.stubTitle2).foregroundStyle(Palette.label).monospacedDigit()
      Text(label).font(.stubFootnote).foregroundStyle(Palette.labelSecondary)
    }
    .accessibilityElement(children: .combine)
  }

  private func privateMessage(_ page: PublicPages.ProfilePage) -> String {
    if page.viewer.isOwner { return "Only people you approve see your shows. This is what everyone else sees." }
    if page.viewer.status == .pending {
      return "Your request is with @\(page.profile.handle). Their shows appear here once they approve it."
    }
    return "Follow @\(page.profile.handle) to see their shows. They approve each follower."
  }

  /// "https://www.instagram.com/you/" → "instagram.com/you"
  static func displayLink(_ link: String) -> String {
    link.replacingOccurrences(of: "^https?://(www\\.)?", with: "", options: .regularExpression)
      .replacingOccurrences(of: "/$", with: "", options: .regularExpression)
  }

  private func load() async {
    guard let me = session.userId else { return }
    do {
      state = .loaded(try await PublicPages.profile(handle: handle, me: me))
    } catch {
      if state.value == nil { state = .failed("Check your connection and try again.") }
    }
  }
}

extension Profile {
  var person: Person {
    Person(id: id, handle: handle, displayName: displayName, avatarURL: avatarURL, isPrivate: isPrivate)
  }
}

extension Person {
  init(id: UUID, handle: String, displayName: String?, avatarURL: URL?, isPrivate: Bool) {
    self.id = id
    self.handle = handle
    self.displayName = displayName
    self.avatarURL = avatarURL
    self.isPrivate = isPrivate
  }
}
