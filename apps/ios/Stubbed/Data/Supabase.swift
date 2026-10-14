import Foundation
import Supabase

/// The one client for the app. Row-level security in Postgres decides what
/// each signed-in user can read and write, exactly as on the web.
let supabase = SupabaseClient(
  supabaseURL: AppConfig.current.supabaseURL,
  supabaseKey: AppConfig.current.supabasePublishableKey
)
