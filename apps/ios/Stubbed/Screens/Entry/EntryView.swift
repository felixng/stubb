import SwiftUI

/// One of your entries, like the web's /app/entries/[id]. The share cards go
/// at the top (#69); below them, what the cards don't show: type, note,
/// trips and visibility. Edit opens the log form; Delete asks first.
struct EntryView: View {
  let id: UUID
  var notice: AppRouter.Notice?

  @Environment(AppRouter.self) private var router
  @Environment(\.dismiss) private var dismiss
  @State private var state: Loadable<Entry> = .loading
  @State private var photo: URL?
  @State private var confirmDelete = false
  @State private var deleting = false
  @State private var deleteError: String?

  var body: some View {
    Screen(title: "") {
      switch state {
      case .loading:
        LoadingText()
      case .failed(let message):
        EmptyState(title: "Couldn’t load this show") { Text(message) }
      case .loaded(let entry):
        content(entry)
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      if let entry = state.value {
        ToolbarItem(placement: .primaryAction) {
          Button("Edit") { router.edit(entry) }
        }
      }
    }
    .task(id: router.dataVersion) { await load() }
  }

  @ViewBuilder private func content(_ entry: Entry) -> some View {
    if let notice {
      banner(notice, planned: entry.planned)
    }

    if entry.planned {
      VStack(alignment: .leading, spacing: Space.m) {
        Text(
          "You’re going on \(Day.formatWeekday(entry.date)). Once you’ve been, track it with your rating and share it."
        )
        .font(.stubSubheadline)
        .foregroundStyle(Palette.label)
        Button("Edit") { router.edit(entry) }
          .buttonStyle(.tintedPill)
      }
      .padding(Space.l)
      .frame(maxWidth: .infinity, alignment: .leading)
      .cardStyle()
    } else if let photo {
      AsyncImage(url: photo) { $0.resizable().scaledToFill() } placeholder: { Palette.fill }
        .frame(maxWidth: .infinity)
        .frame(height: 280)
        .clipShape(.rect(cornerRadius: Radius.md))
        .accessibilityHidden(true)
    }

    VStack(alignment: .leading, spacing: Space.m) {
      VStack(alignment: .leading, spacing: Space.xs) {
        Text(entry.show.title)
          .font(.stubTitle2)
          .foregroundStyle(Palette.label)
          .accessibilityAddTraits(.isHeader)
        Text([entry.show.type.label, entry.whereText].compactMap { $0 }.joined(separator: " · "))
          .font(.stubSubheadline)
          .foregroundStyle(Palette.labelSecondary)
        Text(Day.formatLong(entry.date))
          .font(.stubSubheadline)
          .foregroundStyle(Palette.labelSecondary)
        if let rating = entry.rating {
          RatingStars(value: rating, size: 18).padding(.top, Space.xs)
        }
      }
      if let note = entry.note {
        Text(note)
          .font(.stubBody)
          .foregroundStyle(Palette.label)
      }
      FlowLayout(spacing: Space.s) {
        ForEach(entry.trips, id: \.id) { trip in
          NavigationLink(value: AppRouter.Route.trip(trip.id)) {
            Text(trip.name)
              .font(.stubFootnote.weight(.medium))
              .foregroundStyle(Palette.label)
              .padding(.horizontal, Space.m)
              .frame(minHeight: 28)
              .background(Palette.fill, in: .capsule)
          }
        }
        Text(
          entry.planned
            ? "Only you can see upcoming shows."
            : entry.visibility == .public ? "Public" : "Private. Sharing the image doesn’t change that."
        )
        .font(.stubFootnote)
        .foregroundStyle(Palette.labelSecondary)
        .frame(minHeight: 28)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.top, Space.l)
    .overlay(alignment: .top) { Palette.separator.frame(height: 1) }

    VStack(alignment: .leading, spacing: Space.s) {
      Button(deleting ? "Deleting…" : "Delete", role: .destructive) { confirmDelete = true }
        .font(.stubSubheadline.weight(.semibold))
        .foregroundStyle(Palette.destructive)
        .frame(minHeight: Space.touch)
        .disabled(deleting)
      if let deleteError {
        Text(deleteError).font(.stubFootnote).foregroundStyle(Palette.destructive)
      }
    }
    .confirmationDialog("Delete \(entry.show.title)?", isPresented: $confirmDelete, titleVisibility: .visible) {
      Button("Delete", role: .destructive) { Task { await delete(entry) } }
    } message: {
      Text("This removes it from your diary, with its photo. It can’t be undone.")
    }
  }

  private func banner(_ notice: AppRouter.Notice, planned: Bool) -> some View {
    let failed = notice == .photoFailed
    return Text(
      failed
        ? "Saved, but the photo didn’t upload. Edit the entry to add it again."
        : planned ? "Added to Upcoming in your diary." : "Saved to your diary. Share it?"
    )
    .font(.stubSubheadline.weight(failed ? .regular : .medium))
    .foregroundStyle(failed ? Palette.destructive : Palette.label)
    .padding(.horizontal, Space.l)
    .padding(.vertical, Space.m)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(failed ? Palette.fill : Palette.tintFill, in: .rect(cornerRadius: Radius.md))
    .accessibilityAddTraits(.isStaticText)
  }

  private func load() async {
    do {
      let entry = try await Entries.entry(id)
      if let path = entry.photoPath {
        photo = await Entries.signPhotos([path])[path]
      } else {
        photo = nil
      }
      state = .loaded(entry)
    } catch {
      // Deleted, or not yours: nothing to show.
      if case .loaded = state { return }
      state = .failed("It may have been deleted.")
    }
  }

  private func delete(_ entry: Entry) async {
    deleting = true
    defer { deleting = false }
    do {
      try await Entries.delete(entry)
      dismiss()
      router.dataChanged()
    } catch {
      deleteError = "Couldn’t delete it. Try again."
    }
  }
}
