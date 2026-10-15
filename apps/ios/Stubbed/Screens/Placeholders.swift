import SwiftUI

// Screens still to build: Edit profile (#76), and people and public
// pages (#73).

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

struct PeopleView: View {
  var body: some View {
    Screen(title: "Find people") { EmptyState(title: "Coming soon") { Text("Finding people arrives in #73.") } }
  }
}

struct PublicEntryView: View {
  let id: UUID
  var showComments = false
  var body: some View {
    Screen(title: "") { EmptyState(title: "Coming soon") { Text("Public entries arrive in #73.") } }
  }
}

struct PublicTripView: View {
  let id: UUID
  var body: some View {
    Screen(title: "Trip") { EmptyState(title: "Coming soon") { Text("Public trips arrive in #73.") } }
  }
}
