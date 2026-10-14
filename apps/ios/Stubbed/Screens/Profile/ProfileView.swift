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
  @State private var selecting = false
  @State private var picked: Set<UUID> = []
  @State private var choosingTrip = false
  @State private var confirmDelete = false
  @State private var trips: [Trip] = []
  @State private var selectError: String?

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
    .safeAreaInset(edge: .bottom) {
      if selecting, section == .diary { selectBar }
    }
    .onChange(of: section) { _, _ in endSelecting() }
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
              Button("+ Plan a trip") { router.newTrip() }
                .font(.stubSubheadline.weight(.semibold))
                .foregroundStyle(Palette.tintText)
            }
            if upcomingOpen {
              EntryList(entries: Array(upcoming), photos: data.photos)
            }
          }
        }
        if seen.isEmpty {
          EmptyState(title: "Nothing seen yet") { Text("Your shows appear here once you’ve been.") }
        } else {
          HStack {
            Text(selecting ? (picked.isEmpty ? "Pick shows" : "\(picked.count) selected") : "")
              .font(.stubSubheadline)
              .foregroundStyle(Palette.labelSecondary)
            Spacer()
            Button(selecting ? "Cancel" : "Select") {
              if selecting { endSelecting() } else { selecting = true }
            }
            .font(.stubSubheadline.weight(.semibold))
            .foregroundStyle(Palette.tintText)
            .frame(minHeight: Space.touch)
          }
          EntryList(entries: seen, photos: data.photos, selection: selecting ? $picked : nil)
        }
      }
    }
  }

  // MARK: - Select

  /// Group the picked shows into a trip (one that covers all their dates,
  /// or a new one with dates to fit), or delete them together.
  private var selectBar: some View {
    let chosen = diary.value?.entries.filter { picked.contains($0.id) } ?? []
    let dates = chosen.map(\.date).sorted()
    let covering = trips.filter { trip in dates.allSatisfy(trip.covers) }
    return VStack(spacing: Space.s) {
      if let selectError {
        Text(selectError).font(.stubFootnote).foregroundStyle(Palette.destructive)
      }
      HStack(spacing: Space.m) {
        Button("Add to trip") { choosingTrip = true }
          .buttonStyle(.primary)
        Button("Delete", role: .destructive) { confirmDelete = true }
          .buttonStyle(PillButtonStyle())
          .foregroundStyle(Palette.destructive)
      }
      .disabled(picked.isEmpty)
    }
    .padding(.horizontal, Space.l)
    .padding(.vertical, Space.m)
    .background(Palette.background)
    .overlay(alignment: .top) { Palette.separator.frame(height: 1) }
    .confirmationDialog("Add \(picked.count) to a trip", isPresented: $choosingTrip, titleVisibility: .visible) {
      ForEach(covering) { trip in
        Button(trip.name) { Task { await add(to: trip) } }
      }
      Button("New trip") {
        let ids = Array(picked)
        endSelecting()
        router.newTrip(start: dates.first, end: dates.last, entryIds: ids)
      }
    } message: {
      Text(covering.isEmpty ? "None of your trips covers these dates." : "Trips that cover these dates")
    }
    .confirmationDialog(
      "Delete \(picked.count == 1 ? "this show" : "these \(picked.count) shows")?", isPresented: $confirmDelete,
      titleVisibility: .visible
    ) {
      Button("Delete", role: .destructive) { Task { await deletePicked(chosen) } }
    } message: {
      Text("This can’t be undone.")
    }
  }

  private func endSelecting() {
    selecting = false
    picked = []
    selectError = nil
  }

  private func add(to trip: Trip) async {
    do {
      try await Trips.add(Array(picked), to: trip.id)
      endSelecting()
      router.dataChanged()
      router.profilePath.append(.trip(trip.id))
    } catch {
      selectError = "Couldn’t add them to the trip. Try again."
    }
  }

  private func deletePicked(_ entries: [Entry]) async {
    do {
      for entry in entries { try await Entries.delete(entry) }
      endSelecting()
      router.dataChanged()
    } catch {
      selectError = "Couldn’t delete them. Try again."
      router.dataChanged()
    }
  }

  // MARK: - Load

  private func load() async {
    guard let userId = session.userId else { return }
    async let profile = Profiles.profile(userId)
    async let counts = Profiles.followCounts(userId)
    async let shows = Profiles.loggedCount(userId)
    async let entries = Profiles.ownEntries(userId)
    async let ownTrips = Trips.list(userId)
    do {
      header = .loaded(Header(profile: try await profile, counts: await counts, shows: await shows))
    } catch {
      if header.value == nil { header = .failed("Couldn’t load your profile.") }
    }
    trips = (try? await ownTrips)?.map(\.trip) ?? trips
    do {
      diary = .loaded(try await entries)
    } catch {
      if diary.value == nil { diary = .failed("Check your connection and try again.") }
    }
  }
}
