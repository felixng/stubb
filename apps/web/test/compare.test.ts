import assert from "node:assert/strict";
import { test } from "node:test";

import { compareAttempts, pickBest, type Attempt } from "@/lib/import/compare";
import type { Extracted } from "@/lib/import/drafts";

const show = (over: Partial<Extracted>): Extracted => ({
  show_title: "Hadestown",
  show_type: "musical",
  venue_name: "Walter Kerr Theatre",
  venue_osm_id: null,
  city: null,
  country: null,
  date: "2026-10-10",
  time: "19:00",
  seats: null,
  price: null,
  confidence: "high",
  reason: "",
  ...over,
});

const attempt = (model: string, shows: Extracted[], over: Partial<Attempt> = {}): Attempt => ({
  model,
  state: "done",
  ms: 1000,
  readBy: `${model}:default`,
  shows,
  note: null,
  ...over,
});

test("pickBest prefers a confident answer, then the default chain's order", () => {
  const order = ["groq", "anthropic"];
  const groqGuess = attempt("groq", [show({ confidence: "low" })]);
  const claude = attempt("anthropic", [show({})]);
  const gemini = attempt("gemini", [show({})]);
  assert.equal(pickBest([gemini, groqGuess, claude], order)?.model, "anthropic");
  assert.equal(pickBest([gemini, attempt("groq", [show({ confidence: "medium" })]), claude], order)?.model, "groq");
  // Outside the chain still beats nothing.
  assert.equal(pickBest([gemini, attempt("groq", [], { state: "failed" })], order)?.model, "gemini");
  assert.equal(pickBest([attempt("groq", []), attempt("anthropic", [], { state: "failed" })], order), null);
});

test("compareAttempts: all agree despite spelling of the same show and venue", () => {
  const out = compareAttempts([
    attempt("groq", [show({ show_title: "HADESTOWN", venue_name: "Walter Kerr" })]),
    attempt("anthropic", [show({})]),
  ]);
  assert.deepEqual(out, { answered: 2, differs: [] });
});

test("compareAttempts names the fields that differ", () => {
  const out = compareAttempts([
    attempt("groq", [show({ date: "2026-10-11", time: null })]),
    attempt("anthropic", [show({}), show({ show_title: "Wicked", date: "2026-10-12" })]),
    attempt("gemini", [], { state: "failed" }),
  ]);
  assert.deepEqual(out, { answered: 2, differs: ["number of shows", "date", "time"] });
});

test("compareAttempts needs two answers", () => {
  assert.equal(compareAttempts([attempt("groq", [show({})]), attempt("anthropic", [], { state: "running" })]), null);
});
