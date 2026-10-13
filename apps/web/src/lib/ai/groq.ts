// Groq: fast and cheap. Its vision models take images and JSON Schema
// output but can't search the web.
import { openAiCompatible } from "./openai-compatible";

export const groq = openAiCompatible({
  id: "groq",
  name: "Groq",
  url: "https://api.groq.com/openai/v1/chat/completions",
  keyEnv: "GROQ_API_KEY",
  // Llama 4 Scout: takes images and supports JSON Schema output.
  defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
  images: true,
});
