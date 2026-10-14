import AuthenticationServices
import CryptoKit
import Supabase
import SwiftUI

/// Sign in with Apple, Google, or email + password, like the web's /login.
/// Sign-ups are off in Supabase Auth, so only existing accounts get in.
struct SignInView: View {
  private enum Field { case email, password }

  @State private var email = ""
  @State private var password = ""
  @State private var error: String?
  @State private var busy = false
  @State private var nonce = ""
  @FocusState private var focus: Field?

  var body: some View {
    ScrollView {
      VStack(spacing: Space.xxxl) {
        VStack(spacing: Space.m) {
          Wordmark(size: 44)
          Text("Sign in")
            .font(.stubTitle2)
            .foregroundStyle(Palette.label)
        }
        .padding(.top, 48)

        VStack(spacing: Space.m) {
          SignInWithAppleButton(.continue, onRequest: prepareApple, onCompletion: finishApple)
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .clipShape(.capsule)
            .disabled(busy)

          Button {
            Task { await signInWithGoogle() }
          } label: {
            Text("Continue with Google")
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(NeutralButtonStyle())
          .disabled(busy)
        }

        HStack(spacing: Space.m) {
          Palette.separator.frame(height: 1)
          Text("or")
          Palette.separator.frame(height: 1)
        }
        .font(.stubFootnote)
        .foregroundStyle(Palette.labelSecondary)

        VStack(alignment: .leading, spacing: Space.l) {
          field("Email") {
            TextField("Email", text: $email, prompt: Text(verbatim: "you@example.com"))
              .textContentType(.username)
              .keyboardType(.emailAddress)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled()
              .focused($focus, equals: .email)
              .submitLabel(.next)
              .onSubmit { focus = .password }
          }
          field("Password") {
            SecureField("", text: $password)
              .textContentType(.password)
              .focused($focus, equals: .password)
              .submitLabel(.go)
              .onSubmit { Task { await signInWithPassword() } }
          }
          if let error {
            Text(error)
              .font(.stubFootnote)
              .foregroundStyle(Palette.destructive)
              .accessibilityAddTraits(.isStaticText)
          }
          Button {
            Task { await signInWithPassword() }
          } label: {
            Text(busy ? "Signing in…" : "Sign in")
          }
          .buttonStyle(.primary)
          .disabled(busy)
        }
      }
      .frame(maxWidth: 380)
      .padding(.horizontal, Space.l)
      .frame(maxWidth: .infinity)
    }
    .scrollDismissesKeyboard(.interactively)
    .background(Palette.background)
    .onChange(of: error) { _, message in
      if let message { AccessibilityNotification.Announcement(message).post() }
    }
  }

  private func field<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: Space.s) {
      Text(title)
        .font(.stubSubheadline.weight(.semibold))
        .foregroundStyle(Palette.label)
      content()
        .font(.stubBody)
        .padding(.horizontal, Space.l)
        .frame(minHeight: 50)
        .background(Palette.surface, in: .rect(cornerRadius: Radius.md))
        .overlay(RoundedRectangle(cornerRadius: Radius.md).strokeBorder(Palette.separator))
        .accessibilityLabel(title)
    }
  }

  // MARK: - Email + password

  /// One message for every failure, so the form never reveals which emails
  /// have an account.
  private func signInWithPassword() async {
    let email = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard !email.isEmpty, !password.isEmpty else {
      error = "Enter your email and password."
      return
    }
    busy = true
    defer { busy = false }
    do {
      try await supabase.auth.signIn(email: email, password: password)
      error = nil
    } catch let authError as AuthError where authError.errorCode == .overRequestRateLimit {
      error = "Too many attempts. Wait a minute, then try again."
    } catch {
      self.error = "Email or password is incorrect."
    }
  }

  // MARK: - Apple

  private func prepareApple(_ request: ASAuthorizationAppleIDRequest) {
    nonce = Self.randomNonce()
    request.requestedScopes = [.email, .fullName]
    request.nonce = Self.sha256(nonce)
  }

  private func finishApple(_ result: Result<ASAuthorization, any Error>) {
    switch result {
    case .failure(let failure):
      if (failure as? ASAuthorizationError)?.code != .canceled { error = Self.appleError }
    case .success(let authorization):
      guard
        let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
        let token = credential.identityToken.flatMap({ String(data: $0, encoding: .utf8) })
      else {
        error = Self.appleError
        return
      }
      let nonce = nonce
      Task {
        busy = true
        defer { busy = false }
        do {
          try await supabase.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: token, nonce: nonce))
          error = nil
        } catch {
          Log.app.error("Apple sign-in failed: \(error.localizedDescription, privacy: .public)")
          self.error = Self.appleError
        }
      }
    }
  }

  // "Hide My Email" gives Stubbed a relay address, which matches no account.
  private static let appleError =
    "Couldn’t sign in with Apple. Use the Apple Account that matches your Stubbed email, and choose “Share My Email”."

  static func randomNonce(length: Int = 32) -> String {
    let characters = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    var generator = SystemRandomNumberGenerator()
    return String((0..<length).map { _ in characters.randomElement(using: &generator)! })
  }

  static func sha256(_ input: String) -> String {
    SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
  }

  // MARK: - Google

  /// Google's consent page in a secure browser sheet, back to the app via
  /// stubbed://auth-callback. No Google SDK needed.
  private func signInWithGoogle() async {
    busy = true
    defer { busy = false }
    do {
      try await supabase.auth.signInWithOAuth(provider: .google, redirectTo: authCallbackURL) { session in
        session.prefersEphemeralWebBrowserSession = false
      }
      error = nil
    } catch let failure as ASWebAuthenticationSessionError where failure.code == .canceledLogin {
      // Closed the sheet: nothing to say.
    } catch {
      Log.app.error("Google sign-in failed: \(error.localizedDescription, privacy: .public)")
      self.error = "Couldn’t sign in with Google. Use the Google account that matches your Stubbed email."
    }
  }
}

/// The web's neutral button: `surface` capsule with a `separator` border.
struct NeutralButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.stubHeadline)
      .foregroundStyle(Palette.label)
      .padding(.horizontal, Space.xl)
      .frame(minHeight: 50)
      .background(configuration.isPressed ? Palette.fill : Palette.surface, in: .capsule)
      .overlay(Capsule().strokeBorder(Palette.separator))
  }
}

#Preview {
  SignInView()
}
