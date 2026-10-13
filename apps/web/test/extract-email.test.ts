import assert from "node:assert/strict";
import { test } from "node:test";

import { clean } from "@/lib/import/extract-email";

// The mapping layer between Claude's structured output and drafts; the
// model call itself is not run in tests.
test("clean turns empty strings into nulls and drops invalid values", () => {
  const out = clean({
    kind: "booking",
    shows: [
      {
        show_title: " Hadestown ",
        show_type: "musical",
        venue_name: "Walter Kerr Theatre",
        city: "New York",
        country: "US",
        date: "2026-10-10",
        time: "19:00",
        seats: "",
        price: "$289.00",
        confidence: "high",
        reason: "Confirmation",
      },
      { show_title: "Mystery", show_type: "circus", venue_name: "", city: "", country: "usa", date: "2026-13-45", time: "7pm", seats: "", price: "", confidence: "certain", reason: "" },
      { show_title: "", show_type: "other", venue_name: "Somewhere", city: "", country: "", date: "", time: "", seats: "", price: "", confidence: "low", reason: "" },
    ],
  });
  assert.equal(out.kind, "booking");
  assert.equal(out.shows.length, 2); // no title and no date: dropped
  assert.deepEqual(out.shows[0], {
    show_title: "Hadestown",
    show_type: "musical",
    venue_name: "Walter Kerr Theatre",
    venue_osm_id: null,
    city: "New York",
    country: "US",
    date: "2026-10-10",
    time: "19:00",
    seats: null,
    price: "$289.00",
    confidence: "high",
    reason: "Confirmation",
  });
  assert.equal(out.shows[1].show_type, null);
  assert.equal(out.shows[1].country, null);
  assert.equal(out.shows[1].date, null);
  assert.equal(out.shows[1].time, null);
  assert.equal(out.shows[1].confidence, "low");
});

test("cancellations are always low confidence; unknown kinds aren't bookings", () => {
  const cancelled = clean({ kind: "cancellation", shows: [{ show_title: "Wicked", date: "2026-10-12", confidence: "high" }] });
  assert.equal(cancelled.shows[0].confidence, "low");
  assert.equal(clean({ kind: "spam", shows: [] }).kind, "not_a_booking");
});
