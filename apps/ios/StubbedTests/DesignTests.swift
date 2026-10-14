import Testing
@testable import Stubbed

struct DesignTests {
  @Test func posterInitialsUseTheFirstTwoWords() {
    #expect(Poster.initials("Operation Mincemeat") == "OM")
    #expect(Poster.initials("Hamilton") == "H")
    #expect(Poster.initials("The Book of Mormon") == "TB")
    #expect(Poster.initials("") == "")
  }
}
