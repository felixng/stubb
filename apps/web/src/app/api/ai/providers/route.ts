import { connection } from "next/server";

import { chainFor, listProviders } from "@/lib/ai";
import { currentUser } from "@/lib/supabase/require-user";

// GET → the AI providers (with whether each has a key) and the default chain
// per import task, for the admin import tool's model picker. Never the keys.
// Admins only (see lib/admin).
export async function GET() {
  // Per request: it depends on who's signed in and on the server's env.
  // Without this a GET handler with no request argument is prerendered at
  // build time.
  await connection();
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!user.admin) return Response.json({ error: "forbidden" }, { status: 403 });
  const label = (task: string, images?: boolean) => chainFor(task, { images }).map((m) => `${m.provider}:${m.model}`);
  return Response.json({ providers: await listProviders(), defaults: { email: label("email"), identify: label("identify", true) } });
}
