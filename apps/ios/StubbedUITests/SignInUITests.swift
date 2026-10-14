import XCTest

final class SignInUITests: XCTestCase {
  override func setUp() { continueAfterFailure = false }

  @MainActor
  func testWrongPasswordShowsOneMessage() {
    let app = launchApp()
    signOutIfNeeded(app)
    let field = app.textFields["Email"]
    field.tap()
    field.typeText("nobody@stubbed.local")
    app.secureTextFields["Password"].tap()
    app.secureTextFields["Password"].typeText("wrong-password")
    app.buttons["Sign in"].firstMatch.tap()
    XCTAssertTrue(app.staticTexts["Email or password is incorrect."].waitForExistence(timeout: 10))
    snapshot("sign-in-error")
  }

  @MainActor
  func testSignInStaysSignedInAfterRelaunch() throws {
    let app = launchApp()
    signOutIfNeeded(app)
    snapshot("sign-in")
    try signIn(app)
    XCTAssertTrue(app.buttons["Profile"].waitForExistence(timeout: 15))
    snapshot("signed-in")

    app.terminate()
    app.launch()
    XCTAssertTrue(app.buttons["Profile"].waitForExistence(timeout: 15), "Still signed in after relaunch")
  }
}
