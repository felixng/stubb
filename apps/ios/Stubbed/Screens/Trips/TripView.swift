import SwiftUI

/// A trip, like the web's /app/trips/[id]: name and dates, counts of shows,
/// venues and nights, the recap cards (#71), its shows in date order (take
/// some out, or add others dated within it), Edit and Delete.
struct TripView: View {
  let id: UUID
  var addFailed = false

  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router
  @Environment(\.dismiss) private var dismiss

  @State private var state: Loadable<Model> = .loading
  @State private var mode = Mode.idle
  @State private var picked: Set<UUID> = []
  @State private var busy = false
  @State private var error: String?
  @State private var confirmDelete = false

  enum Mode { case idle, add, remove }

  struct Model {
    var trip: Trip
    /// In the trip, oldest first: it reads like an itinerary.
    var entries: [Entry]
    /// Not in the trip but dated within it, so they could join.
    var others: [Entry]
    var photos: [String: URL]
    var handle: String
    var isPrivate: Bool

    /// Shows seen (planned ones are listed but not counted yet).
    var seen: [Entry] { entries.filter { !$0.planned } }
    var venues: Int { Set(seen.compactMap { $0.venue?.id }).count }
    var nights: Int { Set(seen.map(\.date)).count }
  }

  var body: some View {
    Screen(title: state.value?.trip.name ?? "Trip") {
      switch state {
      case .loading:
        LoadingText()
      case .failed(let message):
        EmptyState(title: "Couldn’t load this trip") { Text(message) }
      case .loaded(let model):
        content(model)
      }
    }
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
      if let trip = state.value?.trip {
        ToolbarItem(placement: .primaryAction) {
          Button("Edit") { router.editTrip(trip) }
        }
      }
    }
    .safeAreaInset(edge: .bottom) {
      if mode != .idle { selectionBar }
    }
    .task(id: router.dataVersion) { await load() }
  }

  @ViewBuilder private func content(_ m: Model) -> some View {
    Text(m.trip.dates)
      .font(.stubSubheadline)
      .foregroundStyle(Palette.labelSecondary)
      .padding(.top, -Space.l)

    if addFailed {
      Text("Trip created, but the shows you picked weren’t added. Add them below.")
        .font(.stubSubheadline)
        .foregroundStyle(Palette.destructive)
        .padding(Space.l)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.fill, in: .rect(cornerRadius: Radius.md))
    }

    HStack(spacing: Space.m) {
      stat(m.seen.count, m.seen.count == 1 ? "show" : "shows")
      stat(m.venues, m.venues == 1 ? "venue" : "venues")
      stat(m.nights, m.nights == 1 ? "night" : "nights")
    }

    if !m.seen.isEmpty {
      TripShare(model: m)
    }

    if !m.entries.isEmpty {
      HStack {
        Text(mode == .remove ? (picked.isEmpty ? "Pick shows to take out of this trip" : "\(picked.count) selected") : "")
          .font(.stubSubheadline)
          .foregroundStyle(Palette.labelSecondary)
        Spacer()
        if mode != .add {
          Button(mode == .remove ? "Cancel" : "Select") {
            if mode == .remove { reset() } else { mode = .remove }
          }
          .font(.stubSubheadline.weight(.semibold))
          .foregroundStyle(Palette.tintText)
          .frame(minHeight: Space.touch)
        }
      }
      EntryList(entries: m.entries, photos: m.photos, selection: mode == .remove ? $picked : nil)
    } else {
      EmptyState(title: "No shows in this trip yet") {
        Text("Add shows dated within the trip, or plan one: it’s offered this trip when its date falls inside.")
      }
    }

    if mode == .idle, !m.others.isEmpty {
      Button("Add shows") {
        picked = Set(m.others.map(\.id))
        mode = .add
      }
      .buttonStyle(.pill)
    }

    if mode == .add {
      HStack {
        Text("Shows within the trip’s dates")
          .font(.stubHeadline)
          .foregroundStyle(Palette.label)
          .accessibilityAddTraits(.isHeader)
        Spacer()
        Button("Cancel") { reset() }
          .font(.stubSubheadline.weight(.semibold))
          .foregroundStyle(Palette.tintText)
      }
      EntryList(entries: m.others, photos: m.photos, selection: $picked)
    }

    Button("Delete trip", role: .destructive) { confirmDelete = true }
      .font(.stubSubheadline.weight(.semibold))
      .foregroundStyle(Palette.destructive)
      .frame(minHeight: Space.touch)
      .confirmationDialog("Delete \(m.trip.name)?", isPresented: $confirmDelete, titleVisibility: .visible) {
        Button("Delete trip", role: .destructive) { Task { await delete() } }
      } message: {
        Text("Its shows stay in your diary.")
      }
  }

  private var selectionBar: some View {
    VStack(spacing: Space.s) {
      if let error {
        Text(error).font(.stubFootnote).foregroundStyle(Palette.destructive)
      }
      let n = picked.count
      Button(
        mode == .add
          ? (n > 0 ? "Add \(n) to this trip" : "Pick shows")
          : (n > 0 ? "Take \(n) out of this trip" : "Pick shows")
      ) {
        Task { await apply() }
      }
      .buttonStyle(.primary)
      .disabled(n == 0 || busy)
    }
    .padding(.horizontal, Space.l)
    .padding(.vertical, Space.m)
    .background(Palette.background)
    .overlay(alignment: .top) { Palette.separator.frame(height: 1) }
  }

  private func stat(_ value: Int, _ label: String) -> some View {
    VStack(spacing: 0) {
      Text("\(value)").font(.stubTitle2).foregroundStyle(Palette.label).monospacedDigit()
      Text(label).font(.stubFootnote).foregroundStyle(Palette.labelSecondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, Space.m)
    .cardStyle()
    .accessibilityElement(children: .combine)
  }

  private func reset() {
    picked = []
    mode = .idle
    error = nil
  }

  private func apply() async {
    guard !picked.isEmpty else { return reset() }
    busy = true
    defer { busy = false }
    do {
      if mode == .add {
        try await Trips.add(Array(picked), to: id)
      } else {
        try await Trips.remove(Array(picked), from: id)
      }
      reset()
      router.dataChanged()
    } catch {
      self.error = "Couldn’t update the trip. Try again."
    }
  }

  private func delete() async {
    do {
      try await Trips.delete(id)
      dismiss()
      router.dataChanged()
    } catch {
      self.error = "Couldn’t delete the trip. Try again."
    }
  }

  private func load() async {
    guard let userId = session.userId else { return }
    do {
      async let trip = Trips.trip(id)
      async let own = Profiles.ownEntries(userId)
      async let profile = Profiles.profile(userId)
      let (t, (all, photos), p) = try await (trip, own, profile)
      state = .loaded(
        Model(
          trip: t,
          entries: all.filter { $0.trips.contains { $0.id == t.id } }.reversed(),
          others: all.filter { e in !e.trips.contains { $0.id == t.id } && t.covers(e.date) },
          photos: photos, handle: p.handle, isPrivate: p.isPrivate))
    } catch {
      if state.value == nil { state = .failed("It may have been deleted.") }
    }
  }
}

/// The trip recap cards: built in #71.
struct TripShare: View {
  let model: TripView.Model
  var body: some View { EmptyView() }
}
