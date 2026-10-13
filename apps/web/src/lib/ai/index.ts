// One entry point for AI calls: a feature passes a provider-neutral request
// and gets back the first acceptable answer from an ordered chain of models.
//
// The chain comes from (first match wins):
//   1. `models` passed by the caller (tests, experiments),
//   2. AI_MODELS_<TASK>, e.g. AI_MODELS_IDENTIFY,
//   3. AI_MODELS,
//   4. DEFAULT_CHAIN: Groq first, Claude as the fallback.
// Each is a comma-separated list of "provider" or "provider:model", e.g.
//   AI_MODELS="groq:meta-llama/llama-4-maverick-17b-128e-instruct,anthropic"
// Providers: groq, anthropic, gemini, cerebras. Models whose provider has no
// API key are skipped, so a chain degrades to whatever is configured, and
// requests with images skip text-only providers (Cerebras). A model that
// throws, declines, or gives an answer the caller's `accept` rejects hands
// over to the next one.
import { anthropic } from "./anthropic";
import { cerebras } from "./cerebras";
import { gemini } from "./gemini";
import { groq } from "./groq";
import type { AiProvider, JsonRequest, ModelRef, ProviderId } from "./types";

export type { JsonRequest, ModelRef, Part } from "./types";

const PROVIDERS: Record<ProviderId, AiProvider> = { groq, anthropic, gemini, cerebras };

const DEFAULT_CHAIN = "groq,anthropic";

export function parseChain(spec: string): ModelRef[] {
  return spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(":");
      const id = (i < 0 ? s : s.slice(0, i)) as ProviderId;
      const provider = PROVIDERS[id];
      if (!provider) throw new Error(`Unknown AI provider "${id}" in "${spec}"`);
      return { provider: id, model: i < 0 ? provider.defaultModel : s.slice(i + 1) };
    });
}

export function resolveChain(task?: string, models?: ModelRef[], needs?: { images?: boolean }): ModelRef[] {
  const spec =
    (task && process.env[`AI_MODELS_${task.toUpperCase()}`]) || process.env.AI_MODELS || DEFAULT_CHAIN;
  return (models ?? parseChain(spec)).filter((m) => {
    const provider = PROVIDERS[m.provider];
    return provider.configured() && (!needs?.images || provider.images);
  });
}

export function aiConfigured(task?: string, needs?: { images?: boolean }) {
  return resolveChain(task, undefined, needs).length > 0;
}

export type GenerateOptions<T> = {
  task?: string;
  models?: ModelRef[];
  // Turn the raw JSON into the caller's type (validate, clamp, default).
  parse: (raw: unknown) => T;
  // Return false to try the next model, e.g. for a "don't know". If no model
  // is accepted, the last parsed answer is returned rather than nothing.
  accept?: (result: T) => boolean;
  // Total time for the whole chain, so a slow first model can't push the
  // fallback past the route's limit.
  budgetMs?: number;
};

export type Generated<T> = { result: T; model: ModelRef };

export async function generateJson<T>(request: JsonRequest, options: GenerateOptions<T>): Promise<Generated<T> | null> {
  const images = request.content.some((part) => part.type === "image");
  const chain = resolveChain(options.task, options.models, { images });
  const deadline = Date.now() + (options.budgetMs ?? 80_000);
  let fallback: Generated<T> | null = null;
  let lastError: unknown = null;

  for (const ref of chain) {
    const remaining = deadline - Date.now();
    if (remaining < 1_000) break;
    const label = `${ref.provider}:${ref.model}`;
    try {
      const started = Date.now();
      const raw = await PROVIDERS[ref.provider].generateJson(ref.model, request, AbortSignal.timeout(remaining));
      if (raw == null) {
        console.warn("AI empty", options.task ?? "", label);
        continue;
      }
      const result = options.parse(raw);
      const answer = { result, model: ref };
      console.info("AI answered", options.task ?? "", label, `${Date.now() - started}ms`);
      if (!options.accept || options.accept(result)) return answer;
      console.info("AI not accepted, trying next", options.task ?? "", label);
      fallback = answer;
    } catch (error) {
      lastError = error;
      console.error("AI failed", options.task ?? "", label, error instanceof Error ? error.message : error);
    }
  }

  if (fallback) return fallback;
  // Every model errored: surface it so the route can report a failure
  // rather than an empty "no idea".
  if (lastError) throw lastError;
  return null;
}
