import SwiftUI

/// A trip as others see it, like the web's /t/:id: the name, dates and
/// place, who went, its numbers, then each public show in date order.
struct PublicTripView: View {
  let id: UUID

  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router
  @State private var state: Loadable<PublicPages.TripPage?> = .loading

  var body: some View {
    Screen(title: state.value??.trip.name ?? "Trip") {
      switch state {
      case .loading:
        LoadingText()
      case .failed(let message):
        EmptyState(title: "Couldn’t load this trip") { Text(message) }
      case .loaded(nil):
        EmptyState(title: "This trip isn’t available") {
          Text("It may be private, or it may have been deleted.")
        }
      case .loaded(let page?):
        summary(page)
        Text("The shows")
          .font(.stubTitle2)
          .foregroundStyle(Palette.label)
          .accessibilityAddTraits(.isHeader)
        ForEach(page.entries) { entry in
          PostCard(
            entry: entry, owner: page.owner, photo: entry.photoPath.flatMap { page.photos[$0] },
            mine: entry.userId == session.userId, inTrip: page.trip.id, reactions: page.reactions[entry.id] ?? Reactions())
        }
      }
    }
    .navigationBarTitleDisplayMode(.large)
    .refreshable { await load() }
    .task(id: router.dataVersion) { await load() }
  }

  private func summary(_ page: PublicPages.TripPage) -> some View {
    var numbers: [(String, String)] = [
      ("\(page.entries.count)", page.entries.count == 1 ? "Show" : "Shows"),
      ("\(page.venues)", page.venues == 1 ? "Theatre" : "Theatres"),
      ("\(page.nights)", page.nights == 1 ? "Night" : "Nights"),
    ]
    if let average = page.average { numbers.append((String(format: "%.1f", average), "Avg rating")) }
    return VStack(alignment: .leading, spacing: Space.l) {
      Text([page.trip.dates, page.place].compactMap { $0 }.joined(separator: " · "))
        .font(.stubSubheadline)
        .foregroundStyle(Palette.labelSecondary)
      NavigationLink(value: AppRouter.Route.profile(handle: page.owner.handle)) {
        HStack(spacing: Space.m) {
          Avatar(name: page.owner.name, url: page.owner.avatarURL, size: 40)
          VStack(alignment: .leading, spacing: 0) {
            Text(verbatim: "@\(page.owner.handle)").font(.stubSubheadline.weight(.semibold)).foregroundStyle(Palette.label)
            if let name = page.owner.displayName {
              Text(name).font(.stubFootnote).foregroundStyle(Palette.labelSecondary)
            }
          }
        }
      }
      .buttonStyle(.plain)
      FlowLayout(spacing: Space.xxxl) {
        ForEach(numbers, id: \.1) { value, label in
          VStack(alignment: .leading, spacing: 0) {
            Text(value).font(.stubTitle2).foregroundStyle(Palette.label).monospacedDigit()
            Text(label).font(.stubFootnote).foregroundStyle(Palette.labelSecondary)
          }
          .accessibilityElement(children: .combine)
        }
      }
    }
    .padding(Space.l)
    .frame(maxWidth: .infinity, alignment: .leading)
    .cardStyle()
  }

  private func load() async {
    do {
      state = .loaded(try await PublicPages.trip(id))
    } catch {
      if state.value == nil { state = .failed("Check your connection and try again.") }
    }
  }
}
