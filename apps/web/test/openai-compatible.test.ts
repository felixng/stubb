import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { openAiCompatible } from "@/lib/ai/openai-compatible";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.TEST_AI_KEY;
});

const provider = (id: "groq" | "cerebras") =>
  openAiCompatible({
    id,
    name: "Test",
    url: `https://${id}.example/v1/chat/completions`,
    keyEnv: "TEST_AI_KEY",
    models: ["vision-new", "vision-old"],
    images: true,
  });

function serve(ids: string[] | null) {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push(`${url} ${new Headers(init?.headers).get("authorization")}`);
    if (!ids) return new Response("nope", { status: 500 });
    return Response.json({ data: ids.map((id) => ({ id })) });
  }) as typeof fetch;
  return calls;
}

test("resolveDefault picks the first preferred model the provider still serves", async () => {
  process.env.TEST_AI_KEY = "k";
  const calls = serve(["vision-old", "text-only"]);
  const p = provider("groq");
  assert.equal(await p.resolveDefault!(), "vision-old");
  assert.deepEqual(await p.listModels!(), ["text-only", "vision-old"]);
  // Cached: one request to the models endpoint, with the key.
  assert.deepEqual(calls, ["https://groq.example/v1/models Bearer k"]);
});

test("resolveDefault falls back to the first preference when the list can't be read", async () => {
  process.env.TEST_AI_KEY = "k";
  serve(null);
  const p = provider("cerebras");
  assert.equal(await p.resolveDefault!(), "vision-new");
  assert.deepEqual(await p.listModels!(), []);
});
