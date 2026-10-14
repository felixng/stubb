import PhotosUI
import SwiftUI

/// Log or edit an entry, like the web's /app/log: show, venue, date, rating
/// (or Upcoming for a future date), note, trip, photo and visibility.
/// Presented as a sheet from the Log button or an entry's Edit.
struct LogView: View {
  let editing: Entry?

  @Environment(AppSession.self) private var session
  @Environment(AppRouter.self) private var router
  @Environment(\.dismiss) private var dismiss

  @State private var context = Entries.FormContext()
  @State private var loaded = false

  @State private var show: ShowChoice?
  @State private var venue: VenueChoice?
  @State private var date = Day.today()
  @State private var rating: Double?
  @State private var note = ""
  @State private var visibility = Visibility.public
  @State private var tripIds: Set<UUID> = []

  @State private var photo: Data?
  @State private var preview: UIImage?
  @State private var existingPhoto: URL?
  @State private var photoItem: PhotosPickerItem?
  @State private var photoError: String?

  @State private var picking: Picker?
  @State private var saving = false
  @State private var error: String?
  @State private var confirmDiscard = false

  /// Fields the user set themselves, which defaults never overwrite.
  @State private var touchedTrips = false
  @State private var touchedVisibility = false

  private enum Picker: String, Identifiable {
    case show, venue
    var id: String { rawValue }
  }

  init(editing: Entry? = nil) {
    self.editing = editing
    if let entry = editing {
      _show = State(initialValue: ShowChoice(entry.show))
      _venue = State(initialValue: entry.venue.map(VenueChoice.init))
      _date = State(initialValue: entry.date)
      _rating = State(initialValue: entry.rating)
      _note = State(initialValue: entry.note ?? "")
      _visibility = State(initialValue: entry.visibility)
      _tripIds = State(initialValue: Set(entry.trips.map(\.id)))
      _touchedTrips = State(initialValue: true)
      _touchedVisibility = State(initialValue: true)
    }
  }

  private var today: String { Day.today() }
  private var planned: Bool { Day.status(date, today: today) == .planned }
  private var offeredTrips: [Trip] { context.trips.filter { $0.covers(date) } }
  private var hasChanges: Bool {
    guard let editing else { return show != nil || venue != nil || rating != nil || !note.isEmpty || photo != nil }
    return show != ShowChoice(editing.show) || venue != editing.venue.map(VenueChoice.init) || date != editing.date
      || rating != editing.rating || note != (editing.note ?? "") || visibility != editing.visibility
      || tripIds != Set(editing.trips.map(\.id)) || photo != nil || (editing.photoPath != nil && existingPhoto == nil && loaded)
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: Space.xxl) {
          photoRow
          showField
          venueField
          dateField
          ratingField
          noteField
          if !offeredTrips.isEmpty { tripsField }
          visibilityField
          if let error {
            Text(error)
              .font(.stubFootnote)
              .foregroundStyle(Palette.destructive)
          }
        }
        .frame(maxWidth: 640)
        .padding(.horizontal, Space.l)
        .padding(.vertical, Space.xl)
        .frame(maxWidth: .infinity)
      }
      .scrollDismissesKeyboard(.interactively)
      .background(Palette.background)
      .safeAreaInset(edge: .bottom) {
        Button(saving ? "Saving…" : editing != nil ? "Save changes" : planned ? "Add to Upcoming" : "Save") {
          Task { await save() }
        }
        .buttonStyle(.primary)
        .disabled(saving)
        .padding(.horizontal, Space.l)
        .padding(.top, Space.m)
        .padding(.bottom, Space.s)
        .background(Palette.background)
        .overlay(alignment: .top) { Palette.separator.frame(height: 1) }
      }
      .navigationTitle(editing == nil ? "Track a show" : "Edit")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { if hasChanges { confirmDiscard = true } else { dismiss() } }
        }
      }
      .confirmationDialog("Discard this entry?", isPresented: $confirmDiscard, titleVisibility: .visible) {
        Button("Discard", role: .destructive) { dismiss() }
        Button("Keep editing", role: .cancel) {}
      }
      .sheet(item: $picking) { picker in
        switch picker {
        case .show:
          ShowSearch { show = $0 }
        case .venue:
          VenueSearch(suggestions: venueSuggestions, place: venuePlace) { venue = $0 }
        }
      }
    }
    .interactiveDismissDisabled(hasChanges)
    .task { await load() }
    .onChange(of: date) { _, _ in preselectTrip() }
    .onChange(of: photoItem) { _, item in
      guard let item else { return }
      photoItem = nil
      Task { await takePhoto(item) }
    }
  }

  // MARK: - Fields

  private var photoRow: some View {
    HStack(alignment: .top, spacing: Space.l) {
      Group {
        if let preview {
          Image(uiImage: preview).resizable().scaledToFill()
        } else if let existingPhoto {
          AsyncImage(url: existingPhoto) { $0.resizable().scaledToFill() } placeholder: { Palette.fill }
        } else {
          Image(systemName: "camera")
            .font(.system(size: 26))
            .foregroundStyle(Palette.labelSecondary)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.fill)
        }
      }
      .frame(width: 96, height: 96)
      .clipShape(.rect(cornerRadius: Radius.sm))
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: Space.xs) {
        HStack(spacing: Space.l) {
          PhotosPicker(hasPhoto ? "Change photo" : "Add photo", selection: $photoItem, matching: .images)
            .foregroundStyle(Palette.tintText)
          if hasPhoto {
            Button("Remove", role: .destructive) {
              photo = nil
              preview = nil
              existingPhoto = nil
            }
            .foregroundStyle(Palette.destructive)
          }
        }
        .font(.stubSubheadline.weight(.semibold))
        .frame(minHeight: Space.touch)
        if let photoError {
          Text(photoError)
            .font(.stubFootnote)
            .foregroundStyle(Palette.destructive)
        }
      }
    }
  }

  private var hasPhoto: Bool { preview != nil || existingPhoto != nil }

  private var showField: some View {
    labelled("Show") {
      if let show {
        SelectedValue(primary: show.title, secondary: show.id == nil ? "New show" : show.type.label) {
          picking = .show
        }
        if show.id == nil {
          ChipRow(label: "Show type") {
            ForEach(ShowType.ordered, id: \.self) { type in
              Chip(title: type.label, selected: show.type == type) { self.show?.type = type }
            }
          }
        }
      } else {
        SearchButton(title: "Search shows") { picking = .show }
      }
    }
  }

  private var venueField: some View {
    labelled("Venue", optional: planned) {
      if let venue {
        SelectedValue(primary: venue.name, secondary: venue.isNew ? "New venue" : venue.place) {
          picking = .venue
        }
        // A venue added by hand needs a city and country for stats.
        if venue.isNew {
          HStack(spacing: Space.m) {
            FormField(label: "City") {
              TextField("City", text: binding(\.city)).textContentType(.addressCity).fieldStyle()
            }
            FormField(label: "Country") {
              TextField("Country", text: binding(\.country)).textContentType(.countryName).fieldStyle()
            }
          }
        }
      } else {
        SearchButton(title: "Search venues") { picking = .venue }
      }
    }
  }

  private func binding(_ key: WritableKeyPath<VenueChoice, String?>) -> Binding<String> {
    Binding(get: { venue?[keyPath: key] ?? "" }, set: { venue?[keyPath: key] = $0 })
  }

  private var dateField: some View {
    labelled("Date") {
      DatePicker("Date", selection: Binding(get: { Day.date(date) }, set: { date = Day.string($0) }), displayedComponents: .date)
        .datePickerStyle(.compact)
        .labelsHidden()
        .tint(Palette.tintText)
      ChipRow(label: "Quick dates") {
        Chip(title: "Today", selected: date == today) { date = today }
        Chip(title: "Yesterday", selected: date == Day.today(offset: -1)) { date = Day.today(offset: -1) }
      }
    }
  }

  @ViewBuilder private var ratingField: some View {
    if planned {
      Text("That’s after today, so this goes in Upcoming. Rate it after you’ve been.")
        .font(.stubSubheadline)
        .foregroundStyle(Palette.label)
        .padding(.horizontal, Space.l)
        .padding(.vertical, Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.tintFill, in: .rect(cornerRadius: Radius.md))
    } else {
      labelled("Rating") {
        RatingInput(value: $rating)
      }
    }
  }

  private var noteField: some View {
    labelled("Note", optional: true) {
      TextField("Note", text: $note, prompt: Text("What stayed with you?"), axis: .vertical)
        .lineLimit(2...10)
        .padding(.vertical, Space.m)
        .fieldStyle()
        .accessibilityLabel("Note")
    }
  }

  private var tripsField: some View {
    labelled("Part of a trip?") {
      ChipRow(label: "Trips") {
        ForEach(offeredTrips) { trip in
          Chip(title: trip.name, selected: tripIds.contains(trip.id)) {
            touchedTrips = true
            if tripIds.contains(trip.id) { tripIds.remove(trip.id) } else { tripIds.insert(trip.id) }
          }
        }
      }
    }
  }

  private var visibilityField: some View {
    labelled("Who can see this") {
      HStack(spacing: Space.s) {
        ForEach([Visibility.public, .private], id: \.self) { option in
          let selected = visibility == option
          Button {
            touchedVisibility = true
            visibility = option
          } label: {
            Text(option == .public ? "Public" : "Private")
              .font(.stubSubheadline.weight(.semibold))
              .foregroundStyle(selected ? Palette.background : Palette.label)
              .frame(maxWidth: .infinity, minHeight: Space.touch)
              .background(selected ? Palette.label : Palette.fill, in: .capsule)
          }
          .buttonStyle(.plain)
          .accessibilityAddTraits(selected ? .isSelected : [])
        }
      }
      Text(visibility == .public ? "Anyone with the link can see this entry." : "Only you can see this entry.")
        .font(.stubFootnote)
        .foregroundStyle(Palette.labelSecondary)
    }
  }

  private func labelled<Content: View>(_ title: String, optional: Bool = false, @ViewBuilder content: () -> Content)
    -> some View
  {
    VStack(alignment: .leading, spacing: Space.s) {
      (Text(title).foregroundStyle(Palette.label)
        + Text(optional ? " (optional)" : "").fontWeight(.regular).foregroundStyle(Palette.labelSecondary))
        .font(.stubSubheadline.weight(.medium))
        .accessibilityAddTraits(.isHeader)
      content()
    }
  }

  // MARK: - Suggestions

  /// The venue last used with this show, then recent venues (up to five).
  private var venueSuggestions: [Venue] {
    var out: [Venue] = []
    func add(_ v: Venue) { if !out.contains(where: { $0.id == v.id }) { out.append(v) } }
    if let showId = show?.id, let last = context.recent.first(where: { $0.showId == showId }) { add(last.venue) }
    for item in context.recent where out.count < 5 { add(item.venue) }
    return out
  }

  private var venuePlace: (city: String?, country: String?) {
    (context.recent.first?.venue.city, context.recent.first?.venue.country)
  }

  // MARK: - Load and save

  private func load() async {
    guard !loaded, let userId = session.userId else { return }
    do {
      context = try await Entries.formContext(userId: userId)
      if !touchedVisibility { visibility = context.visibility }
      if let path = editing?.photoPath { existingPhoto = await Entries.signPhotos([path])[path] }
      preselectTrip()
    } catch {
      Log.data.error("Loading the log form failed: \(error.localizedDescription, privacy: .public)")
    }
    loaded = true
  }

  /// Until the user picks, the first trip covering the date is selected.
  private func preselectTrip() {
    guard !touchedTrips else {
      tripIds = tripIds.filter { id in offeredTrips.contains { $0.id == id } }
      return
    }
    tripIds = offeredTrips.first.map { [$0.id] } ?? []
  }

  private func takePhoto(_ item: PhotosPickerItem) async {
    photoError = nil
    do {
      guard let data = try await item.loadTransferable(type: Data.self) else { throw Photo.Failure.unreadable }
      let jpeg = try Photo.jpeg(from: data, maxEdge: Photo.storedEdge)
      photo = jpeg
      preview = UIImage(data: jpeg)
      existingPhoto = nil
    } catch {
      photoError = "Couldn’t read that photo. Try another."
    }
  }

  private func save() async {
    error = nil
    guard let show else { return error = "Pick a show." }
    if venue == nil, !planned { return error = "Pick a venue." }
    if let venue, venue.isNew,
      (venue.city ?? "").trimmingCharacters(in: .whitespaces).isEmpty
        || (venue.country ?? "").trimmingCharacters(in: .whitespaces).isEmpty
    {
      return error = "Add the venue’s city and country."
    }
    guard let userId = session.userId else { return error = "You’re signed out. Sign in again to save." }

    saving = true
    defer { saving = false }
    let draft = Entries.Draft(
      id: editing?.id ?? UUID(), show: show, venue: venue, date: date, rating: rating, note: note,
      visibility: visibility, tripIds: tripIds.filter { id in offeredTrips.contains { $0.id == id } }, photo: photo,
      keepPhoto: existingPhoto != nil)
    do {
      let saved = try await Entries.save(draft, userId: userId, editing: editing)
      if editing == nil, !planned {
        Analytics.track(
          .entryLogged,
          [
            "method": .string(photo != nil ? "photo" : "manual"), "detection": .string("skipped"),
            "rated": .bool(rating != nil), "has_note": .bool(!note.trimmingCharacters(in: .whitespaces).isEmpty),
            "platform": .string("ios"),
          ])
      }
      router.saved(saved.id, isNew: editing == nil, planned: planned, photoFailed: saved.photoFailed)
    } catch {
      self.error = error.localizedDescription
    }
  }
}

/// A picked show or venue, with "Change" to pick again.
struct SelectedValue: View {
  let primary: String
  let secondary: String?
  let onChange: () -> Void

  var body: some View {
    HStack(spacing: Space.m) {
      VStack(alignment: .leading, spacing: 2) {
        Text(primary)
          .font(.stubHeadline)
          .foregroundStyle(Palette.label)
        if let secondary {
          Text(secondary)
            .font(.stubSubheadline)
            .foregroundStyle(Palette.labelSecondary)
        }
      }
      Spacer()
      Button("Change", action: onChange)
        .font(.stubSubheadline.weight(.semibold))
        .foregroundStyle(Palette.tintText)
        .accessibilityLabel("Change \(primary)")
    }
    .padding(.horizontal, Space.l)
    .padding(.vertical, Space.m)
    .frame(minHeight: 50)
    .background(Palette.surface, in: .rect(cornerRadius: Radius.md))
    .overlay(RoundedRectangle(cornerRadius: Radius.md).strokeBorder(Palette.separator))
  }
}

/// A field-shaped button that opens a search sheet.
struct SearchButton: View {
  let title: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Label(title, systemImage: "magnifyingglass")
        .foregroundStyle(Palette.labelSecondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .fieldStyle()
    }
    .buttonStyle(.plain)
  }
}

/// Chips that wrap onto more lines.
struct ChipRow<Content: View>: View {
  let label: String
  @ViewBuilder var content: Content

  var body: some View {
    FlowLayout(spacing: Space.s) { content }
      .accessibilityElement(children: .contain)
      .accessibilityLabel(label)
  }
}

/// Lays children out left to right, wrapping onto new lines.
struct FlowLayout: Layout {
  var spacing: CGFloat = 8

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let width = proposal.width ?? .infinity
    var x: CGFloat = 0
    var y: CGFloat = 0
    var line: CGFloat = 0
    var widest: CGFloat = 0
    for view in subviews {
      let size = view.sizeThatFits(.unspecified)
      if x > 0, x + size.width > width {
        y += line + spacing
        x = 0
        line = 0
      }
      x += size.width + spacing
      widest = max(widest, x - spacing)
      line = max(line, size.height)
    }
    return CGSize(width: min(widest, width), height: y + line)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var x = bounds.minX
    var y = bounds.minY
    var line: CGFloat = 0
    for view in subviews {
      let size = view.sizeThatFits(.unspecified)
      if x > bounds.minX, x + size.width > bounds.maxX {
        y += line + spacing
        x = bounds.minX
        line = 0
      }
      view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
      x += size.width + spacing
      line = max(line, size.height)
    }
  }
}
