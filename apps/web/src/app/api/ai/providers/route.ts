import { chainFor, listProviders } from "@/lib/ai";
import { requireUserId } from "@/lib/supabase/require-user";

// GET → the AI providers (with whether each has a key) and the default chain
// per import task, for the import tool's model picker. Never the keys.
export async function GET() {
  if (!(await requireUserId())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const label = (task: string, images?: boolean) => chainFor(task, { images }).map((m) => `${m.provider}:${m.model}`);
  return Response.json({ providers: listProviders(), defaults: { email: label("email"), identify: label("identify", true) } });
}
