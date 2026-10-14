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
  /// Signs in as the test user with a handle, or (`newUser`) the one that
  /// hasn't set up a profile yet.
  func signIn(_ app: XCUIApplication, newUser: Bool = false) throws {
    let email = try XCTUnwrap(env[newUser ? "STUBBED_NEW_EMAIL" : "STUBBED_EMAIL"], "Run through scripts/dev ui")
    let password = try XCTUnwrap(env["STUBBED_PASSWORD"])
    let field = app.textFields["Email"]
    field.tap()
    field.typeText(email)
    let secure = app.secureTextFields["Password"]
    secure.tap()
    secure.typeText(password)
    app.buttons["Sign in"].firstMatch.tap()
    dismissSavePassword(app)
  }

  /// iOS offers to save the password after a sign-in; say "Not Now".
  @MainActor
  func dismissSavePassword(_ app: XCUIApplication) {
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    for source in [app, springboard] {
      let notNow = source.buttons["Not Now"]
      if notNow.waitForExistence(timeout: 3) {
        notNow.tap()
        return
      }
    }
  }

  /// Taps a text field once it's on screen. SwiftUI fields with padding
  /// around them can report "not hittable" while they take taps fine, so
  /// this taps the element's centre. Buttons use plain `tap()`, which
  /// scrolls them out from under the keyboard first.
  @MainActor
  func tap(_ element: XCUIElement, timeout: TimeInterval = 10) {
    XCTAssertTrue(element.waitForExistence(timeout: timeout), "\(element) never appeared")
    element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
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
