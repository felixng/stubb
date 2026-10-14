import SwiftUI

/// The signed-in app: Home (the feed), a big centre Log button, and Profile
/// (your diary and trips), like the web's tab bar. Log opens as a sheet over
/// whichever tab you're on. Each tab keeps its own navigation stack, so
/// switching tabs and back returns you where you were.
struct RootView: View {
  enum Tab { case home, profile }

  @State private var tab = Tab.home
  @State private var logging = false

  var body: some View {
    ZStack {
      tabContent(.home) { HomeView() }
      tabContent(.profile) { ProfileView() }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      TabBar(tab: $tab, logging: $logging)
    }
    .sheet(isPresented: $logging) {
      LogView()
    }
  }

  private func tabContent<Content: View>(_ id: Tab, @ViewBuilder content: () -> Content) -> some View {
    NavigationStack { content() }
      .opacity(tab == id ? 1 : 0)
      .allowsHitTesting(tab == id)
      .accessibilityHidden(tab != id)
  }
}

/// Home and Profile either side of a raised tint "Log" capsule.
private struct TabBar: View {
  @Binding var tab: RootView.Tab
  @Binding var logging: Bool

  var body: some View {
    HStack(alignment: .bottom) {
      item(.home, title: "Home", symbol: "house")
      Button {
        logging = true
      } label: {
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

  private func item(_ id: RootView.Tab, title: String, symbol: String) -> some View {
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

#Preview {
  RootView()
}
