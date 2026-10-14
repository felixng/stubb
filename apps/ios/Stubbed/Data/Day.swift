import Foundation

/// Entry and trip dates are calendar days, stored as "yyyy-MM-dd". These
/// helpers keep them as strings (so they sort and compare as the database
/// does) and format them like the web (en-GB: "8 Oct 2026").
enum Day {
  private static func formatter(_ format: String) -> DateFormatter {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_GB")
    f.timeZone = TimeZone(identifier: "UTC")
    f.dateFormat = format
    return f
  }

  /// Today on this phone, optionally offset by whole days.
  static func today(offset: Int = 0, now: Date = Date()) -> String {
    let calendar = Calendar.current
    let day = calendar.date(byAdding: .day, value: offset, to: now) ?? now
    let c = calendar.dateComponents([.year, .month, .day], from: day)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
  }

  /// The day as a Date at noon in the phone's time zone, for DatePicker.
  static func date(_ day: String) -> Date {
    let parts = day.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return Date() }
    return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12)) ?? Date()
  }

  static func string(_ date: Date) -> String { today(offset: 0, now: date) }

  /// A show dated after today is one you're going to.
  static func status(_ day: String, today: String = Day.today()) -> EntryStatus {
    day > today ? .planned : .logged
  }

  /// "8 Oct 2026"
  static func format(_ day: String) -> String { render(day, "d MMM yyyy") }
  /// "Wednesday 8 October 2026"
  static func formatLong(_ day: String) -> String { render(day, "EEEE d MMMM yyyy") }
  /// "Wednesday 8 October"
  static func formatWeekday(_ day: String) -> String { render(day, "EEEE d MMMM") }

  /// "4–8 Oct 2026", "28 Dec 2026 – 3 Jan 2027", or one day.
  static func formatRange(_ from: String, _ to: String) -> String {
    if from == to { return format(from) }
    let sameYear = from.prefix(4) == to.prefix(4)
    return "\(sameYear ? render(from, "d MMM") : format(from)) – \(format(to))"
  }

  private static func render(_ day: String, _ pattern: String) -> String {
    guard let date = formatter("yyyy-MM-dd").date(from: day) else { return day }
    return formatter(pattern).string(from: date)
  }
}
