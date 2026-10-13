// Cerebras: very fast inference. Defaults to Gemma 4 31B, its model that
// takes images (in preview on Cerebras), so it can join photo requests too.
// Its text-only models (e.g. "cerebras:gpt-oss-120b") still work for emails
// when named in AI_MODELS or the import tool's picker; sent a photo they fail
// and the chain moves on.
import { openAiCompatible } from "./openai-compatible";

export const cerebras = openAiCompatible({
  id: "cerebras",
  name: "Cerebras",
  url: "https://api.cerebras.ai/v1/chat/completions",
  keyEnv: "CEREBRAS_API_KEY",
  defaultModel: "gemma-4-31b",
  images: true,
});
