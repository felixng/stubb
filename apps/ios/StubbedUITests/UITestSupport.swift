import XCTest

/// Shared steps for UI tests. `scripts/dev ui` passes the local test user
/// and a folder for screenshots through the environment.
extension XCTestCase {
  var env: [String: String] { ProcessInfo.processInfo.environment }

  @MainActor
  func launchApp() -> XCUIApplication {
    let app = XCUIApplication()
    app.launch()
    return app
  }

  /// Starts from the sign-in screen, signing out first if a session is left
  /// over from an earlier run.
  @MainActor
  func signOutIfNeeded(_ app: XCUIApplication) {
    let profileTab = app.buttons["Profile"]
    if profileTab.waitForExistence(timeout: 5) {
      profileTab.tap()
      app.buttons["Account"].tap()
      app.buttons["Sign out"].tap()
    } else if app.buttons["Sign out"].exists {
      app.buttons["Sign out"].tap()
    }
    XCTAssertTrue(app.textFields["Email"].waitForExistence(timeout: 10))
  }

  @MainActor
  func signIn(_ app: XCUIApplication) throws {
    let email = try XCTUnwrap(env["STUBBED_EMAIL"], "Run through scripts/dev ui")
    let password = try XCTUnwrap(env["STUBBED_PASSWORD"])
    let field = app.textFields["Email"]
    field.tap()
    field.typeText(email)
    let secure = app.secureTextFields["Password"]
    secure.tap()
    secure.typeText(password)
    app.buttons["Sign in"].firstMatch.tap()
  }

  /// Saves the screen as build/ui/<name>.png.
  @MainActor
  func snapshot(_ name: String) {
    let png = XCUIScreen.main.screenshot().pngRepresentation
    if let dir = env["STUBBED_SCREENSHOTS"] {
      try? png.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }
    let attachment = XCTAttachment(data: png, uniformTypeIdentifier: "public.png")
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
