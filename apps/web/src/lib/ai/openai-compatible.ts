// Shared client for providers that speak the OpenAI chat completions API
// (Groq, Cerebras), called with fetch so they add no dependency. None of
// them search the web here, so the prompt is told to answer from what the
// model already knows.
import type { AiProvider, ProviderId } from "./types";

export const NO_SEARCH =
  "\n\nWeb search is not available in this session: skip any searching steps and answer from the input and what you already know. Lower your confidence accordingly.";

// What each provider serves, per server instance: model lists change rarely
// within a day but often within a year, so check every 10 minutes (a failed
// check is retried after one).
const served = new Map<string, { at: number; ttl: number; ids: string[] | null }>();

export function openAiCompatible(config: {
  id: ProviderId;
  name: string;
  url: string;
  keyEnv: string;
  // Preferred default models, best first. The first one the provider still
  // serves is used when no model is named; the first is the fallback when
  // the list can't be read.
  models: string[];
  images: boolean;
}): AiProvider {
  const modelsUrl = config.url.replace(/\/chat\/completions$/, "/models");

  async function servedModels(): Promise<string[] | null> {
    const cached = served.get(config.id);
    if (cached && Date.now() - cached.at < cached.ttl) return cached.ids;
    let ids: string[] | null = null;
    try {
      const response = await fetch(modelsUrl, {
        headers: { authorization: `Bearer ${process.env[config.keyEnv]}` },
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`${config.name} models ${response.status}`);
      const body = (await response.json()) as { data?: { id?: string }[] };
      ids = (body.data ?? []).map((m) => m.id).filter((id): id is string => typeof id === "string").sort();
    } catch (error) {
      console.error("AI model list failed", config.id, error instanceof Error ? error.message : error);
    }
    served.set(config.id, { at: Date.now(), ttl: ids ? 10 * 60_000 : 60_000, ids });
    return ids;
  }

  return {
    id: config.id,
    defaultModel: config.models[0],
    images: config.images,
    configured: () => Boolean(process.env[config.keyEnv]),

    async resolveDefault() {
      const ids = await servedModels();
      return (ids && config.models.find((m) => ids.includes(m))) ?? config.models[0];
    },

    async listModels() {
      return (await servedModels()) ?? [];
    },

    async generateJson(model, request, signal) {
      const response = await fetch(config.url, {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env[config.keyEnv]}` },
        body: JSON.stringify({
          model,
          max_completion_tokens: 2000,
          temperature: 0.2,
          response_format: {
            type: "json_schema",
            json_schema: { name: request.schema.name, schema: request.schema.schema },
          },
          messages: [
            { role: "system", content: request.system + (request.webSearch ? NO_SEARCH : "") },
            {
              role: "user",
              content: request.content.map((part) =>
                part.type === "text"
                  ? { type: "text", text: part.text }
                  : { type: "image_url", image_url: { url: `data:${part.mediaType};base64,${part.base64}` } },
              ),
            },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`${config.name} ${response.status}: ${detail.slice(0, 300)}`);
      }
      const body = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
      return parseJsonText(body.choices?.[0]?.message?.content);
    },
  };
}

// Tolerate a fenced reply from models that ignore the format.
export function parseJsonText(text: string | null | undefined): unknown | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed.replace(/^```(?:json)?\s*|\s*```$/g, ""));
}
