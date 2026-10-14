import SwiftUI

/// The Profile tab, like the web's /app/profile: who you are (avatar, handle,
/// name, bio, counts), then your diary or your trips.
struct ProfileView: View {
  enum Section: String, CaseIterable { case diary = "Diary", trips = "Trips" }

  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router

  @State private var section = Section.diary
  @State private var header: Loadable<Header> = .loading
  @State private var diary: Loadable<(entries: [Entry], photos: [String: URL])> = .loading
  @State private var upcomingOpen = true

  struct Header {
    var profile: Profile
    var counts: FollowCounts
    var shows: Int
  }

  var body: some View {
    Screen(title: "Profile") {
      headerView
      Picker("Profile sections", selection: $section) {
        ForEach(Section.allCases, id: \.self) { Text($0.rawValue) }
      }
      .pickerStyle(.segmented)

      switch section {
      case .diary: diaryView
      case .trips: TripsList()
      }
    }
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Menu {
          Button("Sign out", role: .destructive) { Task { await session.signOut() } }
        } label: {
          Label("Account", systemImage: "ellipsis.circle")
        }
      }
    }
    .refreshable { await load() }
    .task(id: router.dataVersion) { await load() }
  }

  // MARK: - Header

  @ViewBuilder private var headerView: some View {
    switch header {
    case .loading:
      LoadingText()
    case .failed(let message):
      Text(message).font(.stubSubheadline).foregroundStyle(Palette.labelSecondary)
    case .loaded(let h):
      VStack(alignment: .leading, spacing: Space.l) {
        HStack(spacing: Space.l) {
          Avatar(name: h.profile.name, url: h.profile.avatarURL, size: 80)
          VStack(alignment: .leading, spacing: 2) {
            Text(verbatim: "@\(h.profile.handle)")
              .font(.stubTitle)
              .foregroundStyle(Palette.label)
              .lineLimit(1)
              .accessibilityAddTraits(.isHeader)
            if let name = h.profile.displayName, !name.isEmpty {
              Text(name).font(.stubSubheadline).foregroundStyle(Palette.labelSecondary).lineLimit(1)
            }
            if h.profile.isPrivate {
              Text("Private profile").font(.stubFootnote).foregroundStyle(Palette.labelSecondary)
            }
          }
        }
        if let bio = h.profile.bio, !bio.isEmpty {
          Text(bio).font(.stubBody).foregroundStyle(Palette.label)
        }
        HStack(spacing: Space.xxxl) {
          stat(h.shows, h.shows == 1 ? "Show" : "Shows")
          stat(h.counts.followers, h.counts.followers == 1 ? "Follower" : "Followers")
          stat(h.counts.following, "Following")
        }
        HStack(spacing: Space.m) {
          NavigationLink("Edit profile", value: AppRouter.Route.settings)
            .buttonStyle(PillButtonStyle(stretch: true))
          NavigationLink("View public profile", value: AppRouter.Route.profile(handle: h.profile.handle))
            .buttonStyle(PillButtonStyle(stretch: true))
        }
      }
    }
  }

  private func stat(_ value: Int, _ label: String) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(value.formatted())
        .font(.stubTitle2)
        .foregroundStyle(Palette.label)
        .monospacedDigit()
      Text(label)
        .font(.stubFootnote)
        .foregroundStyle(Palette.labelSecondary)
    }
    .accessibilityElement(children: .combine)
  }

  // MARK: - Diary

  @ViewBuilder private var diaryView: some View {
    switch diary {
    case .loading:
      LoadingText()
    case .failed(let message):
      EmptyState(title: "Couldn’t load your diary") { Text(message) }
    case .loaded(let data):
      // Upcoming soonest first; the shows you've seen newest first.
      let upcoming = data.entries.filter(\.planned).reversed()
      let seen = data.entries.filter { !$0.planned }
      if data.entries.isEmpty {
        EmptyState(title: "No shows yet") {
          Button("Add your first theatre visit") { router.startLog() }
            .font(.stubSubheadline.weight(.semibold))
            .foregroundStyle(Palette.tintText)
          Text("Going to one soon? Track it with its date.")
        }
      } else {
        if !upcoming.isEmpty {
          VStack(alignment: .leading, spacing: Space.m) {
            HStack {
              Button {
                withAnimation { upcomingOpen.toggle() }
              } label: {
                HStack(spacing: Space.s) {
                  Image(systemName: "chevron.right")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.labelSecondary)
                    .rotationEffect(.degrees(upcomingOpen ? 90 : 0))
                  Text("Upcoming").font(.stubTitle2).foregroundStyle(Palette.label)
                  Text("\(upcoming.count)").font(.stubSubheadline).foregroundStyle(Palette.labelSecondary)
                }
                .frame(minHeight: Space.touch)
              }
              .buttonStyle(.plain)
              .accessibilityLabel("Upcoming, \(upcoming.count)")
              .accessibilityValue(upcomingOpen ? "Expanded" : "Collapsed")
              Spacer()
            }
            if upcomingOpen {
              EntryList(entries: Array(upcoming), photos: data.photos)
            }
          }
        }
        if seen.isEmpty {
          EmptyState(title: "Nothing seen yet") { Text("Your shows appear here once you’ve been.") }
        } else {
          EntryList(entries: seen, photos: data.photos)
        }
      }
    }
  }

  // MARK: - Load

  private func load() async {
    guard let userId = session.userId else { return }
    async let profile = Profiles.profile(userId)
    async let counts = Profiles.followCounts(userId)
    async let shows = Profiles.loggedCount(userId)
    async let entries = Profiles.ownEntries(userId)
    do {
      header = .loaded(Header(profile: try await profile, counts: await counts, shows: await shows))
    } catch {
      if header.value == nil { header = .failed("Couldn’t load your profile.") }
    }
    do {
      diary = .loaded(try await entries)
    } catch {
      if diary.value == nil { diary = .failed("Check your connection and try again.") }
    }
  }
}

/// Your trips: built in #70.
struct TripsList: View {
  var body: some View {
    EmptyState(title: "No trips yet") { Text("Trips arrive in the next update.") }
  }
}
