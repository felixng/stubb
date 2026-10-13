// Claude via the Anthropic SDK. The only provider here with web search, so
// it's the one to fall back to when a question needs current listings.
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "./types";

export const anthropic: AiProvider = {
  id: "anthropic",
  defaultModel: "claude-opus-5-5",
  images: true,
  configured: () => Boolean(process.env.ANTHROPIC_API_KEY),

  async generateJson(model, request, signal) {
    const client = new Anthropic({ maxRetries: 1 });
    const tools: Anthropic.Beta.BetaToolUnion[] = [];
    if (request.webSearch) {
      const { maxUses, location } = request.webSearch;
      tools.push({
        type: "web_search_20260209",
        name: "web_search",
        max_uses: maxUses,
        // Localises results ("what's on near me") when we know the area.
        ...(location ? { user_location: { type: "approximate" as const, ...location } } : {}),
      });
    }

    const messages: Anthropic.Beta.BetaMessageParam[] = [
      {
        role: "user",
        content: request.content.map((part) =>
          part.type === "text"
            ? { type: "text", text: part.text }
            : { type: "image", source: { type: "base64", media_type: part.mediaType, data: part.base64 } },
        ),
      },
    ];

    // A long web search can pause the turn; resume it a couple of times.
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await client.beta.messages.create(
        {
          model,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: request.system,
          output_config: {
            ...(request.effort ? { effort: request.effort } : {}),
            format: { type: "json_schema", schema: request.schema.schema },
          },
          ...(tools.length ? { tools } : {}),
          messages,
        },
        { signal },
      );

      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }
      if (response.stop_reason === "refusal") {
        console.error("Anthropic refused", response.stop_details?.category ?? null);
        return null;
      }

      // With web search the answer can arrive split across several text
      // blocks (citations); the JSON is everything after the last search.
      const lastTool = response.content.findLastIndex((b) => b.type !== "text");
      const json = response.content
        .slice(lastTool + 1)
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      return json ? JSON.parse(json) : null;
    }
    return null;
  },
};
