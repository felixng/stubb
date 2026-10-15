import SwiftUI

/// One show as a post, like the web's PublicEntryCard: who and when, the
/// show, where, stars, the note, the photo and trip chips, then Like and
/// Comment on public shows. Used by the feed and public profiles.
struct PostCard: View {
  let entry: Entry
  let owner: Person
  let photo: URL?
  /// Your own show opens your entry screen; others' open their public page.
  var mine = false
  /// Leaves out the header on a trip's page, which already says whose it is.
  var inTrip: UUID?
  /// Trip chips link to trip pages only where they'd open.
  var linkTrips = true
  var reactions: Reactions?

  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router
  @State private var shown: Reactions?
  @State private var writing = false
  @State private var likeError: String?

  private var route: AppRouter.Route { mine ? .entry(entry.id) : .publicEntry(entry.id) }

  var body: some View {
    VStack(alignment: .leading, spacing: Space.m) {
      if inTrip == nil {
        HStack(spacing: Space.m) {
          NavigationLink(value: AppRouter.Route.profile(handle: owner.handle)) {
            HStack(spacing: Space.m) {
              Avatar(name: owner.name, url: owner.avatarURL, size: 40)
              VStack(alignment: .leading, spacing: 0) {
                Text(verbatim: "@\(owner.handle)")
                  .font(.stubSubheadline.weight(.semibold))
                  .foregroundStyle(Palette.label)
                  .lineLimit(1)
                Text(date)
                  .font(.stubFootnote)
                  .foregroundStyle(Palette.labelSecondary)
              }
            }
          }
          .buttonStyle(.plain)
          .accessibilityLabel("@\(owner.handle), \(date)")
          .accessibilityHint("Opens their profile")
          Spacer()
          if mine, entry.visibility == .private {
            Text("Private")
              .font(.stubFootnote.weight(.medium))
              .foregroundStyle(Palette.labelSecondary)
              .padding(.horizontal, Space.m)
              .frame(minHeight: 28)
              .background(Palette.fill, in: .capsule)
          }
        }
      } else {
        Text(date).font(.stubFootnote).foregroundStyle(Palette.labelSecondary)
      }

      NavigationLink(value: route) {
        VStack(alignment: .leading, spacing: Space.xs) {
          Text(entry.show.title)
            .font(.stubTitle2)
            .foregroundStyle(Palette.label)
            .multilineTextAlignment(.leading)
          Text([entry.show.type.label, entry.whereText].compactMap { $0 }.joined(separator: " · "))
            .font(.stubSubheadline)
            .foregroundStyle(Palette.labelSecondary)
            .multilineTextAlignment(.leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(.rect)
      }
      .buttonStyle(.plain)

      if let rating = entry.rating { RatingStars(value: rating, size: 20) }
      if let note = entry.note {
        Text(note).font(.stubBody).foregroundStyle(Palette.label)
      }
      if let photo {
        AsyncImage(url: photo) { $0.resizable().scaledToFill() } placeholder: { Palette.fill }
          .frame(maxWidth: .infinity)
          .aspectRatio(4 / 5, contentMode: .fit)
          .frame(maxHeight: 480)
          .clipShape(.rect(cornerRadius: Radius.md))
          .accessibilityLabel("Photo from \(entry.show.title)")
      }
      let trips = entry.trips.filter { $0.id != inTrip }
      if !trips.isEmpty {
        FlowLayout(spacing: Space.s) {
          ForEach(trips, id: \.id) { trip in
            if linkTrips {
              NavigationLink(value: mine ? AppRouter.Route.trip(trip.id) : .publicTrip(trip.id)) { tripChip(trip.name) }
                .buttonStyle(.plain)
            } else {
              tripChip(trip.name)
            }
          }
        }
      }
      if let state = shown ?? reactions {
        reactionsRow(state)
      }
    }
    .padding(Space.l)
    .frame(maxWidth: .infinity, alignment: .leading)
    .cardStyle()
    .onChange(of: reactions) { _, _ in shown = nil }
  }

  private var date: String { Day.formatPost(entry.date) }

  private func tripChip(_ name: String) -> some View {
    Text(name)
      .font(.stubFootnote.weight(.medium))
      .foregroundStyle(Palette.label)
      .padding(.horizontal, Space.m)
      .frame(minHeight: 28)
      .background(Palette.fill, in: .capsule)
  }

  /// Like and Comment, as on Hevy. A like shows at once and writes in the
  /// background.
  private func reactionsRow(_ state: Reactions) -> some View {
    HStack(spacing: Space.xs) {
      Button {
        Task { await toggleLike(state) }
      } label: {
        HStack(spacing: 6) {
          Image(systemName: state.liked ? "heart.fill" : "heart")
            .font(.system(size: 20))
            .foregroundStyle(state.liked ? Palette.tint : Palette.labelSecondary)
          if state.likes > 0 { Text("\(state.likes)").monospacedDigit() }
        }
        .padding(.horizontal, Space.m)
        .frame(minHeight: Space.touch)
        .contentShape(.rect)
      }
      .buttonStyle(.plain)
      .accessibilityLabel("Like")
      .accessibilityValue("\(state.likes) \(state.likes == 1 ? "like" : "likes")")
      .accessibilityAddTraits(state.liked ? .isSelected : [])

      NavigationLink(value: AppRouter.Route.publicEntry(entry.id, comments: true)) {
        HStack(spacing: 6) {
          Image(systemName: "bubble.left")
            .font(.system(size: 19))
            .foregroundStyle(Palette.labelSecondary)
          if state.comments > 0 { Text("\(state.comments)").monospacedDigit() }
        }
        .padding(.horizontal, Space.m)
        .frame(minHeight: Space.touch)
        .contentShape(.rect)
      }
      .buttonStyle(.plain)
      .accessibilityLabel("Comment")
      .accessibilityValue("\(state.comments) \(state.comments == 1 ? "comment" : "comments")")
      if let likeError {
        Text(likeError).font(.stubFootnote).foregroundStyle(Palette.destructive)
      }
    }
    .font(.stubSubheadline.weight(.semibold))
    .foregroundStyle(Palette.label)
    .padding(.horizontal, -Space.m)
    .padding(.bottom, -Space.s)
  }

  private func toggleLike(_ state: Reactions) async {
    guard !writing, let userId = session.userId else { return }
    writing = true
    defer { writing = false }
    likeError = nil
    let liked = !state.liked
    shown = Reactions(likes: max(0, state.likes + (liked ? 1 : -1)), comments: state.comments, liked: liked)
    do {
      try await ReactionsAPI.setLiked(liked, entryId: entry.id, userId: userId)
    } catch {
      shown = state
      likeError = "Couldn’t update. Try again."
    }
  }
}
