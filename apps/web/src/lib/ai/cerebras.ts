// Cerebras: very fast inference. Defaults to Qwen 3.8 27B, which takes
// images, so it joins photo requests too. (Gemma 4 31B, its first image
// model, left the shared API on 3 September 2026.) Text-only models such as
// "cerebras:gpt-oss-120b" still work for emails when named; sent a photo
// they fail and the chain moves on.
import { openAiCompatible } from "./openai-compatible";

export const cerebras = openAiCompatible({
  id: "cerebras",
  name: "Cerebras",
  url: "https://api.cerebras.ai/v1/chat/completions",
  keyEnv: "CEREBRAS_API_KEY",
  models: ["qwen-3.8-27b"],
  images: true,
});
