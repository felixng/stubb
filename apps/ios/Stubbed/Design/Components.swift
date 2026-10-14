import SwiftUI

/// "stubbed" in lowercase, heavy, tight tracking, in `label`, never the tint.
/// VoiceOver reads "Stubbed". Matches the web's Wordmark.
struct Wordmark: View {
  var size: CGFloat = 28

  var body: some View {
    Text(verbatim: "stubbed")
      .font(.system(size: max(16, size), weight: .heavy))
      .tracking(-0.045 * max(16, size))
      .foregroundStyle(Palette.label)
      .accessibilityLabel("Stubbed")
  }
}

/// Five stars in half steps, read-only. Filled stars use `star`, empty ones
/// `outline`. Never a bare number.
struct RatingStars: View {
  let value: Double
  var size: CGFloat = 16

  var body: some View {
    let rating = min(5, max(0, value))
    HStack(spacing: 2) {
      ForEach(0..<5, id: \.self) { i in
        let fill = rating - Double(i)
        Image(systemName: fill >= 1 ? "star.fill" : fill >= 0.5 ? "star.leadinghalf.filled" : "star")
          .font(.system(size: size))
          .foregroundStyle(fill >= 0.5 ? Palette.star : Palette.outline)
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("Rated \(rating.formatted()) out of 5")
  }
}

/// Round avatar: the profile photo, or the first letter of the name on
/// `tint-fill` when there isn't one.
struct Avatar: View {
  let name: String
  let url: URL?
  let size: CGFloat

  var body: some View {
    Group {
      if let url {
        AsyncImage(url: url) { image in
          image.resizable().scaledToFill()
        } placeholder: {
          Palette.fill
        }
      } else {
        Text(String(name.drop(while: { $0 == "@" }).prefix(1)).uppercased())
          .font(.system(size: size * 0.42, weight: .bold))
          .foregroundStyle(Palette.tintText)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(Palette.tintFill)
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .accessibilityHidden(true)
  }
}

/// A capsule for a category, tag or filter. With an action it's a toggle;
/// selected chips invert (never the tint).
struct Chip: View {
  let title: String
  var selected = false
  var action: (() -> Void)?

  var body: some View {
    if let action {
      Button(action: action) { label }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    } else {
      label
    }
  }

  private var label: some View {
    Text(title)
      .font(.stubFootnote.weight(.medium))
      .foregroundStyle(selected ? Palette.background : Palette.label)
      .padding(.horizontal, Space.m)
      .frame(minHeight: 28)
      .background(selected ? Palette.label : Palette.fill, in: .capsule)
  }
}

/// A 2:3 poster; with no image, the show's initials in `outline` on `fill`.
struct Poster: View {
  let title: String
  var url: URL?
  var width: CGFloat = 56

  var body: some View {
    Group {
      if let url {
        AsyncImage(url: url) { image in
          image.resizable().scaledToFill()
        } placeholder: {
          Palette.fill
        }
      } else {
        Text(Self.initials(title))
          .font(.system(size: width * 0.39, weight: .bold))
          .foregroundStyle(Palette.outline)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(Palette.fill)
      }
    }
    .frame(width: width, height: width * 1.5)
    .clipShape(.rect(cornerRadius: Radius.sm))
    .accessibilityHidden(true)
  }

  static func initials(_ title: String) -> String {
    title.split(whereSeparator: \.isWhitespace).prefix(2).compactMap(\.first).map(String.init).joined()
  }
}

/// A diary or search row: poster, title, venue and date, rating (or
/// "Upcoming" for a planned show).
struct ShowRow: View {
  let title: String
  var venue: String?
  var date: String?
  var rating: Double?
  var planned = false
  var photo: URL?

  var body: some View {
    HStack(spacing: Space.l) {
      Poster(title: title, url: photo)
      VStack(alignment: .leading, spacing: Space.xs) {
        Text(title)
          .font(.stubHeadline)
          .foregroundStyle(Palette.label)
        let meta = [venue, date].compactMap { $0 }.joined(separator: " · ")
        if !meta.isEmpty {
          Text(meta)
            .font(.stubSubheadline)
            .foregroundStyle(Palette.labelSecondary)
            .lineLimit(1)
        }
        if planned {
          Chip(title: "Upcoming")
        } else if let rating {
          RatingStars(value: rating, size: 14)
        }
      }
      Spacer(minLength: 0)
    }
    .padding(.vertical, Space.s)
    .accessibilityElement(children: .combine)
  }
}

/// The body of a screen with nothing in it yet.
struct EmptyState<Content: View>: View {
  let title: String
  @ViewBuilder var content: Content

  var body: some View {
    VStack(spacing: Space.s) {
      Text(title)
        .font(.stubHeadline)
        .foregroundStyle(Palette.label)
      content
        .font(.stubSubheadline)
        .foregroundStyle(Palette.labelSecondary)
        .frame(maxWidth: 320)
    }
    .multilineTextAlignment(.center)
    .padding(.horizontal, Space.xxl)
    .padding(.vertical, 48)
    .frame(maxWidth: .infinity)
    .cardStyle()
  }
}

/// The primary button: tint capsule with `on-tint` text.
struct PrimaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.stubHeadline)
      .foregroundStyle(Palette.onTint)
      .padding(.horizontal, Space.xl)
      .frame(minHeight: 50)
      .frame(maxWidth: .infinity)
      .background(configuration.isPressed ? Palette.tintPressed : Palette.tint, in: .capsule)
  }
}

/// The secondary button: `fill` capsule, like "Edit profile".
struct PillButtonStyle: ButtonStyle {
  var tinted = false

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(size: 15, weight: .semibold))
      .foregroundStyle(tinted ? Palette.tintText : Palette.label)
      .padding(.horizontal, Space.l)
      .frame(minHeight: Space.touch)
      .background(configuration.isPressed || tinted ? Palette.tintFill : Palette.fill, in: .capsule)
  }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
  static var primary: PrimaryButtonStyle { .init() }
}

extension ButtonStyle where Self == PillButtonStyle {
  static var pill: PillButtonStyle { .init() }
  static var tintedPill: PillButtonStyle { .init(tinted: true) }
}

/// "Loading…" in secondary text, as on the web.
struct LoadingText: View {
  var body: some View {
    Text("Loading…")
      .font(.stubSubheadline)
      .foregroundStyle(Palette.labelSecondary)
      .frame(maxWidth: .infinity, alignment: .leading)
  }
}

#Preview {
  ScrollView {
    VStack(alignment: .leading, spacing: 16) {
      Wordmark(size: 30)
      RatingStars(value: 3.5)
      HStack {
        Avatar(name: "felix", url: nil, size: 48)
        Chip(title: "NYC Oct 2026")
        Chip(title: "Selected", selected: true) {}
      }
      ShowRow(title: "Operation Mincemeat", venue: "Golden Theatre", date: "8 Oct 2026", rating: 4.5)
      ShowRow(title: "Hamilton", venue: "Richard Rodgers", date: "20 Oct 2026", planned: true)
      EmptyState(title: "Nothing here yet") { Text("Track a show and it appears here.") }
      Button("Save") {}.buttonStyle(.primary)
      Button("Edit profile") {}.buttonStyle(.pill)
    }
    .padding()
  }
  .background(Palette.background)
}
