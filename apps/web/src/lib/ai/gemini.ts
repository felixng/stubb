// Google Gemini via the REST generateContent API, called with fetch (no
// SDK). Takes images, and Gemini 3 models can combine Google Search
// grounding with JSON Schema output.
import { parseJsonText } from "./openai-compatible";
import type { AiProvider } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiResponse = {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
};

export const gemini: AiProvider = {
  id: "gemini",
  // Owner's pick: the model the free-tier key has quota for. (The
  // "gemini-flash-latest" alias hit the key's quota limit.)
  defaultModel: "gemini-3.8-flash",
  images: true,
  configured: () => Boolean(process.env.GEMINI_API_KEY),

  async generateJson(model, request, signal) {
    const response = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [
          {
            role: "user",
            parts: request.content.map((part) =>
              part.type === "text"
                ? { text: part.text }
                : { inlineData: { mimeType: part.mediaType, data: part.base64 } },
            ),
          },
        ],
        // Grounding has no use cap like Claude's max_uses; the model decides.
        ...(request.webSearch ? { tools: [{ googleSearch: {} }] } : {}),
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: request.schema.schema,
          ...(request.effort === "low" || request.effort === "high"
            ? { thinkingConfig: { thinkingLevel: request.effort } }
            : {}),
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Gemini ${response.status}: ${detail.slice(0, 300)}`);
    }
    const body = (await response.json()) as GeminiResponse;
    const candidate = body.candidates?.[0];
    if (body.promptFeedback?.blockReason || !candidate || candidate.finishReason === "SAFETY") {
      console.error("Gemini declined", body.promptFeedback?.blockReason ?? candidate?.finishReason ?? null);
      return null;
    }
    const text = (candidate.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("");
    return parseJsonText(text);
  },
};
