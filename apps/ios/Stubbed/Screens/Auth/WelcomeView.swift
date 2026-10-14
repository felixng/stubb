import SwiftUI

/// Set up your profile: built in #65.
struct WelcomeView: View {
  @Environment(AppSession.self) private var session

  var body: some View {
    VStack(spacing: Space.l) {
      Wordmark(size: 36)
      Text("Set up your profile")
        .font(.stubTitle2)
      Button("Sign out") { Task { await session.signOut() } }
        .buttonStyle(.pill)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Palette.background)
  }
}
