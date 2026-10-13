// The provider-neutral shape of an AI call. Features (identify, later email
// import) describe what they want here; each provider in this folder turns
// it into its own API call. Nothing outside lib/ai imports a provider SDK.

export type ProviderId = "groq" | "anthropic" | "gemini" | "cerebras";

export type ModelRef = { provider: ProviderId; model: string };

export type Part = { type: "text"; text: string } | { type: "image"; base64: string; mediaType: "image/jpeg" };

export type JsonRequest = {
  system: string;
  content: Part[];
  // JSON Schema the answer must match. Keep it to what every provider
  // accepts: all properties required, additionalProperties false, no
  // nullable enums ("unknown" is an empty string).
  schema: { name: string; schema: Record<string, unknown> };
  // Used by providers that can search; the others are told to answer from
  // what they know.
  webSearch?: { maxUses: number; location?: { country: string; city?: string } };
  effort?: "low" | "medium" | "high";
};

export interface AiProvider {
  id: ProviderId;
  defaultModel: string;
  // Whether it accepts image parts. Requests with images skip it otherwise.
  images: boolean;
  configured(): boolean;
  // The parsed JSON answer, or null when the model declined or said nothing.
  // Throws on transport or API errors; the chain moves on either way.
  generateJson(model: string, request: JsonRequest, signal: AbortSignal): Promise<unknown | null>;
}
