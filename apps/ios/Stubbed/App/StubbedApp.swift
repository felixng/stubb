import SwiftUI

@main
struct StubbedApp: App {
  init() {
    // Navigation titles in `label`, like the web's headings.
    let label = UIColor(Palette.label)
    UINavigationBar.appearance().largeTitleTextAttributes = [.foregroundColor: label]
    UINavigationBar.appearance().titleTextAttributes = [.foregroundColor: label]
  }

  @State private var session = AppSession()

  var body: some Scene {
    WindowGroup {
      SessionGate()
        .environment(session)
        .task { await session.observe() }
        .tint(Palette.tintText)
        // Always light for now, like the web (owner's call). The palette
        // already has dark values for when that changes.
        .preferredColorScheme(.light)
    }
  }
}
