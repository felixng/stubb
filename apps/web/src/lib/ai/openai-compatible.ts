// Shared client for providers that speak the OpenAI chat completions API
// (Groq, Cerebras), called with fetch so they add no dependency. None of
// them search the web here, so the prompt is told to answer from what the
// model already knows.
import type { AiProvider, ProviderId } from "./types";

export const NO_SEARCH =
  "\n\nWeb search is not available in this session: skip any searching steps and answer from the input and what you already know. Lower your confidence accordingly.";

export function openAiCompatible(config: {
  id: ProviderId;
  name: string;
  url: string;
  keyEnv: string;
  defaultModel: string;
  images: boolean;
}): AiProvider {
  return {
    id: config.id,
    defaultModel: config.defaultModel,
    images: config.images,
    configured: () => Boolean(process.env[config.keyEnv]),

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
