import assert from "node:assert/strict";
import { test } from "node:test";

import { listProviders, parseModelChoice } from "@/lib/ai";

test("parseModelChoice: none, a provider, or provider:model", () => {
  assert.equal(parseModelChoice(undefined), undefined);
  assert.equal(parseModelChoice(""), undefined);
  const groq = parseModelChoice("groq");
  assert.equal(groq?.length, 1);
  assert.equal(groq?.[0].provider, "groq");
  assert.ok(groq?.[0].model); // the provider's static default
  assert.equal(groq?.[0].auto, true); // resolved against Groq's model list at call time
  assert.deepEqual(parseModelChoice("groq:meta-llama/llama-4-maverick-17b-128e-instruct"), [
    { provider: "groq", model: "meta-llama/llama-4-maverick-17b-128e-instruct" },
  ]);
});

test("parseModelChoice rejects unknown providers, chains and odd input", () => {
  assert.equal(parseModelChoice("openai"), null);
  assert.equal(parseModelChoice("groq,anthropic"), null); // one model only, no fallback chain
  assert.equal(parseModelChoice("groq:model with spaces"), null);
  assert.equal(parseModelChoice(42), null);
  assert.equal(parseModelChoice(`groq:${"x".repeat(200)}`), null);
});

test("listProviders reports every provider without exposing keys", async () => {
  const providers = await listProviders();
  assert.deepEqual(providers.map((p) => p.id).sort(), ["anthropic", "cerebras", "gemini", "groq"]);
  for (const p of providers) assert.deepEqual(Object.keys(p).sort(), ["compareModels", "configured", "defaultModel", "id", "images", "models", "name"]);
});

test("Claude runs several models side by side in compare mode", async () => {
  const claude = (await listProviders()).find((p) => p.id === "anthropic");
  assert.deepEqual(claude?.compareModels, ["claude-opus-5-5", "claude-haiku-5-5"]);
  for (const m of claude?.compareModels ?? []) assert.deepEqual(parseModelChoice(`anthropic:${m}`), [{ provider: "anthropic", model: m }]);
});
