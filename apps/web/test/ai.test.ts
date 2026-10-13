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

test("the default chain is Claude Opus 5.5, then Claude Haiku 5.5", async () => {
  const { chainFor } = await import("@/lib/ai");
  const saved = { key: process.env.ANTHROPIC_API_KEY, all: process.env.AI_MODELS, identify: process.env.AI_MODELS_IDENTIFY };
  process.env.ANTHROPIC_API_KEY = "test";
  delete process.env.AI_MODELS;
  delete process.env.AI_MODELS_IDENTIFY;
  try {
    assert.deepEqual(chainFor("identify", { images: true }), [
      { provider: "anthropic", model: "claude-opus-5-5" },
      { provider: "anthropic", model: "claude-haiku-5-5" },
    ]);
  } finally {
    for (const [k, v] of [["ANTHROPIC_API_KEY", saved.key], ["AI_MODELS", saved.all], ["AI_MODELS_IDENTIFY", saved.identify]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
