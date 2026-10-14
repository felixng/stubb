import Foundation
import Supabase
import Testing
import UIKit
@testable import Stubbed

struct ProfileRulesTests {
  @Test func normalizesPastedHandles() {
    #expect(ProfileRules.normalizeHandle("@Felix.Ng ") == "felixng")
    #expect(ProfileRules.normalizeHandle("théâtre_fan") == "thtre_fan")
  }

  @Test func explainsHandleProblems() {
    #expect(ProfileRules.handleProblem("") == "Pick a handle.")
    #expect(ProfileRules.handleProblem("ab") == "At least 3 characters.")
    #expect(ProfileRules.handleProblem(String(repeating: "a", count: 21)) == "At most 20 characters.")
    #expect(ProfileRules.handleProblem("Felix") == "Letters, numbers and underscores only.")
    #expect(ProfileRules.handleProblem("felix_ng") == nil)
  }

  @Test func normalizesLinks() {
    #expect(ProfileRules.normalizeLink("instagram.com/you") == "https://instagram.com/you")
    #expect(ProfileRules.normalizeLink("http://example.com") == "http://example.com")
    #expect(ProfileRules.normalizeLink("not a link") == nil)
    #expect(ProfileRules.normalizeLink("localhost") == nil)
    #expect(ProfileRules.normalizeLink("ftp://example.com") == nil)
  }

  @Test func findsOwnAvatarPathsOnly() {
    let me = UUID(uuidString: "4BEFF782-C9E5-40FC-8460-B4EB5D6F814A")!
    let mine = URL(string: "http://127.0.0.1:54321/storage/v1/object/public/avatars/4beff782-c9e5-40fc-8460-b4eb5d6f814a/1.jpg")
    let theirs = URL(string: "http://127.0.0.1:54321/storage/v1/object/public/avatars/someone-else/1.jpg")
    #expect(Avatars.ownPath(mine, userId: me) == "4beff782-c9e5-40fc-8460-b4eb5d6f814a/1.jpg")
    #expect(Avatars.ownPath(theirs, userId: me) == nil)
    #expect(Avatars.ownPath(URL(string: "https://lh3.googleusercontent.com/a/x"), userId: me) == nil)
  }

  @Test func asksGoogleFor512pxPhotosOnly() {
    #expect(
      Avatars.googlePhotoURL(["avatar_url": .string("https://lh3.googleusercontent.com/a/abc=s96-c")])?.absoluteString
        == "https://lh3.googleusercontent.com/a/abc=s512-c")
    #expect(Avatars.googlePhotoURL(["picture": .string("https://evil.example.com/a.jpg")]) == nil)
    #expect(Avatars.googlePhotoURL([:]) == nil)
  }

  @Test func reencodesPhotosSmallerAndSquare() throws {
    let image = UIGraphicsImageRenderer(size: CGSize(width: 3000, height: 2000)).image { context in
      UIColor.red.setFill()
      context.fill(CGRect(x: 0, y: 0, width: 3000, height: 2000))
    }
    let source = try #require(image.pngData())
    let stored = try #require(UIImage(data: Photo.jpeg(from: source, maxEdge: Photo.storedEdge)))
    #expect(stored.size.width * stored.scale == 1600)
    let avatar = try #require(UIImage(data: Photo.jpeg(from: source, maxEdge: Photo.avatarEdge, square: true)))
    #expect(avatar.size.width == avatar.size.height)
    #expect(avatar.size.width * avatar.scale == 512)
  }
}
