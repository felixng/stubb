import assert from "node:assert/strict";
import { test } from "node:test";

import { bearerToken } from "@/lib/supabase/bearer";

test("bearerToken: reads the token from a Bearer header", () => {
  assert.equal(bearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(bearerToken("bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(bearerToken("Bearer   abc.def.ghi  "), "abc.def.ghi");
});

test("bearerToken: anything else is no token", () => {
  assert.equal(bearerToken(null), null);
  assert.equal(bearerToken(undefined), null);
  assert.equal(bearerToken(""), null);
  assert.equal(bearerToken("Bearer"), null);
  assert.equal(bearerToken("Bearer "), null);
  assert.equal(bearerToken("Basic dXNlcjpwYXNz"), null);
  assert.equal(bearerToken("Bearer two tokens"), null);
});
