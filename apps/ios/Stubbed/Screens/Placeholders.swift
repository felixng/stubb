import SwiftUI

// Screens still to build: Home (#72), Edit profile (#76) and public
// profiles (#73).

struct HomeView: View {
  var body: some View {
    Screen(title: "Home") {
      EmptyState(title: "Nothing here yet") {
        Text("Track a show and it appears here, along with shows from people you follow.")
      }
    }
  }
}

struct SettingsView: View {
  var body: some View {
    Screen(title: "Edit profile") { EmptyState(title: "Coming soon") { Text("Editing your profile arrives in #76.") } }
  }
}

struct PublicProfileView: View {
  let handle: String
  var body: some View {
    Screen(title: "@\(handle)") { EmptyState(title: "Coming soon") { Text("Public profiles arrive in #73.") } }
  }
}
