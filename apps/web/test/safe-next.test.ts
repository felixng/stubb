import assert from "node:assert/strict";
import { test } from "node:test";

import { safeNext } from "@/lib/safe-next";

test("safeNext: app paths and public profiles pass", () => {
  assert.equal(safeNext("/app"), "/app");
  assert.equal(safeNext("/app/log"), "/app/log");
  assert.equal(safeNext("/@alice"), "/@alice");
  assert.equal(safeNext("/@Alice_2"), "/@Alice_2");
});

test("safeNext: public entry and trip pages pass", () => {
  const id = "e0000000-0000-0000-0000-0000000000b1";
  assert.equal(safeNext(`/e/${id}`), `/e/${id}`);
  assert.equal(safeNext(`/t/${id}`), `/t/${id}`);
  for (const bad of [`/e/${id}/x`, `/e/${id}?next=//evil.com`, "/e/../app", `/x/${id}`, "/e/abc"]) {
    assert.equal(safeNext(bad), "/app", bad);
  }
});

test("safeNext: anything else goes to /app", () => {
  for (const bad of ["", "/", "//evil.com", "/@alice/../x", "/@al", "/@alice?x=//evil.com", "https://evil.com", "/application"]) {
    assert.equal(safeNext(bad), "/app", bad);
  }
  assert.equal(safeNext(null), "/app");
});
