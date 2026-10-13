// Cerebras: very fast text models. No confirmed image input, so the chain
// skips it for photo requests; it suits text-only tasks such as pasted
// ticket emails. Set images: true here if a vision model becomes available.
import { openAiCompatible } from "./openai-compatible";

export const cerebras = openAiCompatible({
  id: "cerebras",
  name: "Cerebras",
  url: "https://api.cerebras.ai/v1/chat/completions",
  keyEnv: "CEREBRAS_API_KEY",
  defaultModel: "gpt-oss-120b",
  images: false,
});
