import Foundation
import Supabase

/// Where Google sign-in returns to the app (the URL scheme is in
/// Config/Info.plist; the URL must be in Supabase Auth's redirect allow-list).
let authCallbackURL = URL(string: "stubbed://auth-callback")!

/// The one client for the app. Row-level security in Postgres decides what
/// each signed-in user can read and write, exactly as on the web. The
/// session is kept in the Keychain, so the app stays signed in.
let supabase = SupabaseClient(
  supabaseURL: AppConfig.current.supabaseURL,
  supabaseKey: AppConfig.current.supabasePublishableKey,
  options: SupabaseClientOptions(
    auth: .init(redirectToURL: authCallbackURL)
  )
)
