import { notFound } from "next/navigation";

import { currentUser } from "@/lib/supabase/require-user";

// Renders its children only for an admin (see lib/admin); a 404 for anyone
// else. The proxy already turns non-admins away from /app/admin with a 404;
// this is the check that doesn't depend on it. Wrap it in <Suspense>: it
// reads the session.
export async function AdminOnly({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user?.admin) notFound();
  return <>{children}</>;
}
