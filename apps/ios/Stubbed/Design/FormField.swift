import SwiftUI

/// A labelled form field like the web's: label (with "(optional)"), an
/// optional character counter, the control, then a hint or error line.
struct FormField<Control: View>: View {
  let label: String
  var optional = false
  var counter: String?
  var message: String?
  var isError = false
  @ViewBuilder var control: Control

  var body: some View {
    VStack(alignment: .leading, spacing: Space.s) {
      HStack(alignment: .firstTextBaseline) {
        Text(label).foregroundStyle(Palette.label)
          + Text(optional ? " (optional)" : "").fontWeight(.regular).foregroundStyle(Palette.labelSecondary)
        Spacer()
        if let counter {
          Text(counter)
            .font(.stubFootnote)
            .foregroundStyle(Palette.labelSecondary)
            .monospacedDigit()
        }
      }
      .font(.stubSubheadline.weight(.medium))
      .accessibilityHidden(true)

      control
        .accessibilityLabel(label)

      if let message {
        Text(message)
          .font(.stubFootnote)
          .foregroundStyle(isError ? Palette.destructive : Palette.labelSecondary)
      }
    }
  }
}

extension View {
  /// The web's input: `surface`, a `separator` border, 12pt corners.
  func fieldStyle(minHeight: CGFloat = 50) -> some View {
    self
      .font(.stubBody)
      .foregroundStyle(Palette.label)
      .padding(.horizontal, Space.l)
      .frame(minHeight: minHeight)
      .background(Palette.surface, in: .rect(cornerRadius: Radius.md))
      .overlay(RoundedRectangle(cornerRadius: Radius.md).strokeBorder(Palette.separator))
  }
}
