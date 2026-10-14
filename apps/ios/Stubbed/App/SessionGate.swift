import SwiftUI

/// Picks the screen for where the user is: signing in, setting up their
/// profile, or using the app.
struct SessionGate: View {
  @Environment(AppSession.self) private var session

  var body: some View {
    Group {
      switch session.phase {
      case .starting:
        Palette.background
          .ignoresSafeArea()
          .overlay { Wordmark(size: 36) }
      case .signedOut:
        SignInView()
      case .needsProfile:
        WelcomeView()
      case .ready:
        RootView()
      case .failed(let message):
        VStack(spacing: Space.l) {
          Text(message)
            .font(.stubSubheadline)
            .foregroundStyle(Palette.labelSecondary)
            .multilineTextAlignment(.center)
          Button("Try again") { Task { await session.reload() } }
            .buttonStyle(.tintedPill)
        }
        .padding(Space.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.background)
      }
    }
    .animation(.default, value: session.phase)
  }
}
