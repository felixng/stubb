import Supabase
import SwiftUI

/// Placeholder until the real screens land (apps/ios/README.md has the scope).
/// Shows whether the app can reach its Supabase project.
struct RootView: View {
  private enum Backend {
    case checking
    case reachable
    case unreachable(String)
  }

  @State private var backend = Backend.checking

  var body: some View {
    VStack(spacing: 12) {
      Text("Stubbed")
        .font(.largeTitle.bold())
        .foregroundStyle(.tint)
      Group {
        switch backend {
        case .checking:
          Label("Connecting…", systemImage: "antenna.radiowaves.left.and.right")
        case .reachable:
          Label("Connected to \(AppConfig.current.supabaseURL.host() ?? "Supabase")", systemImage: "checkmark.circle")
        case .unreachable(let message):
          Label(message, systemImage: "exclamationmark.triangle")
        }
      }
      .font(.footnote)
      .foregroundStyle(.secondary)
      .multilineTextAlignment(.center)
    }
    .padding()
    .task { await checkBackend() }
  }

  private func checkBackend() async {
    do {
      _ = try await supabase.from("shows").select("id", head: true).execute()
      backend = .reachable
    } catch {
      backend = .unreachable("Can't reach Supabase: \(error.localizedDescription)")
    }
  }
}

#Preview {
  RootView()
}
