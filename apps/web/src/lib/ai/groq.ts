// Groq: fast and cheap. Its vision models take images and JSON Schema
// output but can't search the web.
import { openAiCompatible } from "./openai-compatible";

export const groq = openAiCompatible({
  id: "groq",
  name: "Groq",
  url: "https://api.groq.com/openai/v1/chat/completions",
  keyEnv: "GROQ_API_KEY",
  // Groq's Qwen vision models, newest first; whichever the key can use wins.
  // Llama 4 Scout, the earlier default, was shut down on 17 July 2026.
  models: ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"],
  images: true,
});
