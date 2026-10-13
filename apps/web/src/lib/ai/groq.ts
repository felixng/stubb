// Groq's OpenAI-compatible chat API, called with fetch (no SDK). Fast and
// cheap, but its vision models can't search the web, so the prompt is told
// to answer from the photo and what the model already knows.
import type { AiProvider } from "./types";

const URL = "https://api.groq.com/openai/v1/chat/completions";

const NO_SEARCH =
  "\n\nWeb search is not available in this session: skip any searching steps and answer from the input and what you already know. Lower your confidence accordingly.";

export const groq: AiProvider = {
  id: "groq",
  // Llama 4 Scout: takes images and supports JSON Schema output.
  defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
  configured: () => Boolean(process.env.GROQ_API_KEY),

  async generateJson(model, request, signal) {
    const response = await fetch(URL, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
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
      throw new Error(`Groq ${response.status}: ${detail.slice(0, 300)}`);
    }
    const body = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    // Tolerate a fenced reply from models that ignore the format.
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  },
};
