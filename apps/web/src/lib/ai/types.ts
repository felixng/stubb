// The provider-neutral shape of an AI call. Features (identify, later email
// import) describe what they want here; each provider in this folder turns
// it into its own API call. Nothing outside lib/ai imports a provider SDK.

export type ProviderId = "groq" | "anthropic" | "gemini" | "cerebras";

// `auto`: no model was named, so the provider picks its current default
// (resolveDefault) when the call is made.
export type ModelRef = { provider: ProviderId; model: string; auto?: boolean };

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
  // The model to use when none is named. Providers retire models every few
  // months, so those that can check what they currently serve do.
  resolveDefault?(): Promise<string>;
  // Model ids the provider serves to this key, for the import tool's picker.
  listModels?(): Promise<string[]>;
  // Several of its models to run side by side in the import tool's compare
  // mode, one column each. Otherwise one column with the default model.
  compareModels?: string[];
  // The parsed JSON answer, or null when the model declined or said nothing.
  // Throws on transport or API errors; the chain moves on either way.
  generateJson(model: string, request: JsonRequest, signal: AbortSignal): Promise<unknown | null>;
}
