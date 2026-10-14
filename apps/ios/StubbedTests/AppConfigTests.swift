import Foundation
import Testing
@testable import Stubbed

struct AppConfigTests {
  @Test func readsTheBuildsSupabaseProject() {
    let config = AppConfig.current
    #expect(config.supabaseURL.scheme == "http" || config.supabaseURL.scheme == "https")
    #expect(config.supabasePublishableKey.hasPrefix("sb_publishable_"))
  }

  @Test func readsValuesFromInfoDictionary() {
    let config = AppConfig(info: [
      "SupabaseURL": "https://example.supabase.co",
      "SupabasePublishableKey": "sb_publishable_test",
      "WebURL": "https://example.com",
    ])
    #expect(config.supabaseURL.host() == "example.supabase.co")
    #expect(config.webURL.absoluteString == "https://example.com")
  }
}
