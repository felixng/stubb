import SwiftUI

// The three tab screens, filled in by later issues: Home (#72), Profile
// (#68) and Log (#66).

struct HomeView: View {
  var body: some View {
    Screen(title: "Home") {
      EmptyState(title: "Nothing here yet") {
        Text("Track a show and it appears here, along with shows from people you follow.")
      }
    }
  }
}

struct ProfileView: View {
  @Environment(AppSession.self) private var session

  var body: some View {
    Screen(title: "Profile") {
      EmptyState(title: "No shows yet") {
        Text("Log your first one.")
      }
    }
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Menu {
          Button("Sign out", role: .destructive) { Task { await session.signOut() } }
        } label: {
          Label("Account", systemImage: "ellipsis.circle")
        }
      }
    }
  }
}

struct LogView: View {
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      Screen(title: "Track a show") {
        EmptyState(title: "Coming soon") {
          Text("Logging a show arrives with the log form.")
        }
      }
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
        }
      }
    }
  }
}
