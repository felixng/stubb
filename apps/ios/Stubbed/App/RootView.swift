import SwiftUI

/// The signed-in app: Home (the feed), a big centre Log button, and Profile
/// (your diary and trips), like the web's tab bar. Log opens as a sheet over
/// whichever tab you're on. Each tab keeps its own navigation stack, so
/// switching tabs and back returns you where you were.
struct RootView: View {
  @State private var router = AppRouter()

  var body: some View {
    @Bindable var router = router
    ZStack {
      tab(.home, path: $router.homePath) { HomeView() }
      tab(.profile, path: $router.profilePath) { ProfileView() }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      TabBar(tab: $router.tab) { router.startLog() }
    }
    .sheet(item: $router.log) { request in
      LogView(editing: request.editing)
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
          case .trip: Text("Trip")  // #70
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
