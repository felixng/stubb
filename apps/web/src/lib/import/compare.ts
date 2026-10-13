// Comparing what several AI models read from the same source (the import
// tool's "Compare all providers" mode). Pure, so the rules are unit tested
// and a mobile flow could show the same summary.
import { showKey, type Extracted } from "./drafts";

// One model's reading of one source (an email, or a photo visit).
export type Attempt = {
  // What was requested: "" for the default chain, else "provider[:model]".
  model: string;
  state: "running" | "done" | "failed";
  // Round trip as the browser saw it.
  ms: number | null;
  // Which model actually answered, as the server reports it.
  readBy: string | null;
  shows: Extracted[];
  // Extra context: "Cancellation", "No booking found", or why it failed.
  note: string | null;
};

const provider = (model: string) => model.split(":")[0];

// The reading to turn into drafts by default: a confident answer first,
// then the provider order of the default chain, then whatever answered.
export function pickBest(attempts: Attempt[], order: string[]): Attempt | null {
  const answered = attempts.filter((a) => a.state === "done" && a.shows.length);
  if (!answered.length) return null;
  const rank = (a: Attempt) => {
    const confident = a.shows.some((s) => s.show_title && s.confidence !== "low") ? 0 : 1;
    const i = order.indexOf(provider(a.readBy ?? a.model));
    return confident * 100 + (i < 0 ? 50 : i);
  };
  return [...answered].sort((a, b) => rank(a) - rank(b))[0];
}

export type Agreement = { answered: number; differs: string[] };

// Where the models that answered disagree, field by field, judged on the
// shows they found (in date order). Null when fewer than two answered.
export function compareAttempts(attempts: Attempt[]): Agreement | null {
  const answered = attempts.filter((a) => a.state === "done");
  if (answered.length < 2) return null;
  const sorted = answered.map((a) => [...a.shows].sort((x, y) => (x.date ?? "").localeCompare(y.date ?? "")));
  const differs: string[] = [];
  if (new Set(sorted.map((s) => s.length)).size > 1) differs.push("number of shows");
  const fields: [string, (e: Extracted) => string][] = [
    ["show", (e) => (e.show_title ? showKey(e.show_title) : "")],
    ["venue", (e) => (e.venue_name ?? "").toLowerCase().replace(/^the\s+/, "").replace(/\s+theat(re|er)$/, "")],
    ["date", (e) => e.date ?? ""],
    ["time", (e) => e.time ?? ""],
  ];
  const most = Math.max(...sorted.map((s) => s.length));
  for (const [name, value] of fields) {
    for (let i = 0; i < most; i++) {
      const values = new Set(sorted.filter((s) => s[i]).map((s) => value(s[i])));
      if (values.size > 1) {
        differs.push(name);
        break;
      }
    }
  }
  return { answered: answered.length, differs };
}
