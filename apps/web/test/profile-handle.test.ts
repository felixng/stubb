import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { HANDLE_PATTERN, RESERVED_HANDLES, handleProblem, isReservedHandleError } from "@/lib/profile-handle";

const MIGRATION = new URL("../../../supabase/migrations/20261014150000_reserved_handles.sql", import.meta.url);

test("reserved handles: the app and Postgres refuse the same list", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const array = sql.match(/any \(array\[([\s\S]*?)\]\)/);
  assert.ok(array, "reserved handle array not found in the migration");
  const inSql = [...array[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(inSql, [...RESERVED_HANDLES].sort());
});

test("reserved handles: each is a valid handle shape", () => {
  for (const h of RESERVED_HANDLES) assert.match(h, HANDLE_PATTERN, h);
});

test("handleProblem: reserved handles are refused unless already held", () => {
  assert.equal(handleProblem("admin"), "That handle is reserved. Try another.");
  assert.equal(handleProblem("stubbed", "alice"), "That handle is reserved. Try another.");
  assert.equal(handleProblem("stubbed", "stubbed"), null);
  assert.equal(handleProblem("admin_fan"), null);
  assert.equal(handleProblem("al"), "At least 3 characters.");
});

test("isReservedHandleError: only the trigger's check violation", () => {
  assert.equal(isReservedHandleError({ code: "23514", message: 'handle "admin" is reserved' }), true);
  assert.equal(isReservedHandleError({ code: "23514", message: "violates check constraint" }), false);
  assert.equal(isReservedHandleError({ code: "23505", message: "reserved" }), false);
  assert.equal(isReservedHandleError(null), false);
});
