import SwiftUI
import UIKit

/// The signed-in app: Home (the feed), a big centre Log button, and Profile
/// (your diary and trips), like the web's tab bar. Log opens as a sheet over
/// whichever tab you're on. Each tab keeps its own navigation stack, so
/// switching tabs and back returns you where you were.
struct RootView: View {
  @State private var router = AppRouter()
  /// The tab bar hides while the keyboard is up, as iOS tab bars do, so it
  /// never sits on top of the field you're typing in.
  @State private var keyboardUp = false

  var body: some View {
    @Bindable var router = router
    ZStack {
      tab(.home, path: $router.homePath) { HomeView() }
      tab(.profile, path: $router.profilePath) { ProfileView() }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      if !keyboardUp {
        TabBar(tab: $router.tab) { router.startLog() }
      }
    }
    .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in
      keyboardUp = true
    }
    .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
      keyboardUp = false
    }
    .sheet(item: $router.log) { request in
      LogView(editing: request.editing)
    }
    .sheet(item: $router.tripForm) { request in
      TripForm(request: request)
    }
    .environment(router)
  }

  private func tab<Content: View>(
    _ id: AppRouter.Tab, path: Binding<[AppRouter.Route]>, @ViewBuilder content: () -> Content
  ) -> some View {
    NavigationStack(path: path) {
      content()
        .navigationDestination(for: AppRouter.Route.self) { route in
          switch route {
          case .entry(let id, let notice): EntryView(id: id, notice: notice)
          case .trip(let id, let addFailed): TripView(id: id, addFailed: addFailed)
          case .settings: SettingsView()
          case .profile(let handle): PublicProfileView(handle: handle)
          case .people: PeopleView()
          case .publicEntry(let id, let comments): PublicEntryView(id: id, showComments: comments)
          case .publicTrip(let id): PublicTripView(id: id)
          case .follows(let handle, let list): FollowsListView(handle: handle, list: list)
          }
        }
    }
    .opacity(router.tab == id ? 1 : 0)
    .allowsHitTesting(router.tab == id)
    .accessibilityHidden(router.tab != id)
  }
}

/// Home and Profile either side of a raised tint "Log" capsule.
private struct TabBar: View {
  @Binding var tab: AppRouter.Tab
  let log: () -> Void

  var body: some View {
    HStack(alignment: .bottom) {
      item(.home, title: "Home", symbol: "house")
      Button(action: log) {
        Label("Log", systemImage: "plus")
          .font(.stubHeadline)
          .labelStyle(.titleAndIcon)
          .foregroundStyle(Palette.onTint)
          .padding(.horizontal, Space.xl)
          .frame(minHeight: 56)
          .background(Palette.tint, in: .capsule)
          .shadow(color: Palette.shadow.opacity(0.55), radius: 6, y: 6)
      }
      .buttonStyle(.plain)
      .offset(y: -14)
      .frame(maxWidth: .infinity)
      .accessibilityHint("Track a show")
      item(.profile, title: "Profile", symbol: "person.crop.circle")
    }
    .padding(.horizontal, Space.s)
    .frame(height: 49)
    .background {
      Palette.surface
        .ignoresSafeArea(edges: .bottom)
        .overlay(alignment: .top) { Palette.separator.frame(height: 1) }
    }
    // Reserve the height the Log button rises above the bar, so the last
    // row of a list can scroll clear of it.
    .padding(.top, 14)
  }

  private func item(_ id: AppRouter.Tab, title: String, symbol: String) -> some View {
    let selected = tab == id
    return Button {
      tab = id
    } label: {
      VStack(spacing: 2) {
        Image(systemName: selected ? "\(symbol).fill" : symbol)
          .font(.system(size: 22))
        Text(title)
          .font(.system(size: 10, weight: .medium))
      }
      .foregroundStyle(selected ? Palette.tintText : Palette.labelSecondary)
      .frame(maxWidth: .infinity, minHeight: 49)
      .contentShape(.rect)
    }
    .buttonStyle(.plain)
    .accessibilityAddTraits(selected ? .isSelected : [])
  }
}
