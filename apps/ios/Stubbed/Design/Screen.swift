import SwiftUI

/// A scrolling app screen on the `background` colour: a large title, then
/// content in a column capped at the web's 640pt, with its 16pt gutters.
struct Screen<Content: View>: View {
  let title: String
  @ViewBuilder var content: Content

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: Space.xl) {
        content
      }
      .frame(maxWidth: 640)
      .padding(.horizontal, Space.l)
      .padding(.vertical, Space.xl)
      .frame(maxWidth: .infinity)
    }
    .background(Palette.background)
    .navigationTitle(title)
    .toolbarBackground(Palette.background, for: .navigationBar)
  }
}
