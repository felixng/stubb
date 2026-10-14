import XCTest

/// Signs in as the new test user, which `scripts/dev ui` recreates without
/// a handle before every run.
final class WelcomeUITests: XCTestCase {
  override func setUp() { continueAfterFailure = false }

  @MainActor
  func testOnboardingChecksTheHandleThenOpensTheApp() throws {
    let app = launchApp()
    signOutIfNeeded(app)
    try signIn(app, newUser: true)

    XCTAssertTrue(app.staticTexts["Set up your profile"].waitForExistence(timeout: 15))
    let name = app.textFields["Name"]
    tap(name)
    name.typeText("iOS Test")

    let handle = app.textFields["Handle"]
    tap(handle)
    handle.typeText("Admin")
    XCTAssertTrue(app.staticTexts["That handle is reserved. Try another."].waitForExistence(timeout: 10))
    snapshot("welcome-reserved")

    handle.typeText(XCUIKeyboardKey.delete.rawValue.repeated(5) + "ios_new")
    XCTAssertTrue(app.staticTexts["@ios_new is yours."].waitForExistence(timeout: 10))
    snapshot("welcome-available")

    // The keyboard covers Continue: scroll it into view, as a person would.
    app.scrollViews.firstMatch.swipeUp()
    app.buttons["Continue"].tap()
    XCTAssertTrue(app.buttons["Profile"].waitForExistence(timeout: 15))
  }
}

private extension String {
  func repeated(_ count: Int) -> String { String(repeating: self, count: count) }
}
