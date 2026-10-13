import assert from "node:assert/strict";
import { test } from "node:test";

import type { User } from "@supabase/supabase-js";

import { googlePhotoUrl } from "@/lib/avatar";

const user = (user_metadata: Record<string, unknown>) => ({ user_metadata }) as unknown as User;

test("googlePhotoUrl: asks Google for 512 px", () => {
  assert.equal(
    googlePhotoUrl(user({ avatar_url: "https://lh3.googleusercontent.com/a/ACg8abc=s96-c" })),
    "https://lh3.googleusercontent.com/a/ACg8abc=s512-c",
  );
  assert.equal(
    googlePhotoUrl(user({ picture: "https://lh3.googleusercontent.com/a/ACg8abc" })),
    "https://lh3.googleusercontent.com/a/ACg8abc=s512-c",
  );
});

test("googlePhotoUrl: only Google's image host over https", () => {
  assert.equal(googlePhotoUrl(user({ avatar_url: "https://evil.example/a.jpg" })), null);
  assert.equal(googlePhotoUrl(user({ avatar_url: "https://googleusercontent.com.evil.example/a" })), null);
  assert.equal(googlePhotoUrl(user({ avatar_url: "http://lh3.googleusercontent.com/a/x" })), null);
  assert.equal(googlePhotoUrl(user({ avatar_url: "not a url" })), null);
  assert.equal(googlePhotoUrl(user({})), null);
});
