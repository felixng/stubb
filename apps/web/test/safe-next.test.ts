import assert from "node:assert/strict";
import { test } from "node:test";

import { safeNext } from "@/lib/safe-next";

test("safeNext: app paths and public profiles pass", () => {
  assert.equal(safeNext("/app"), "/app");
  assert.equal(safeNext("/app/log"), "/app/log");
  assert.equal(safeNext("/@alice"), "/@alice");
  assert.equal(safeNext("/@Alice_2"), "/@Alice_2");
});

test("safeNext: anything else goes to /app", () => {
  for (const bad of ["", "/", "//evil.com", "/@alice/../x", "/@al", "/@alice?x=//evil.com", "https://evil.com", "/application"]) {
    assert.equal(safeNext(bad), "/app", bad);
  }
  assert.equal(safeNext(null), "/app");
});
