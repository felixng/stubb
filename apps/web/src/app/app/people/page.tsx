import type { Metadata } from "next";
import { Suspense } from "react";

import { PeopleSearch } from "@/components/profile/PeopleSearch";
import { ownerContext } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Find people" };

async function Search() {
  const { userId } = await ownerContext();
  return userId ? <PeopleSearch userId={userId} /> : null;
}

// Find people to follow; their public shows then appear in your feed.
export default function PeoplePage() {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-display text-label">Find people</h1>
        <p className="text-subheadline text-label-secondary">Follow people to see the shows they track in your feed.</p>
      </div>
      <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
        <Search />
      </Suspense>
    </section>
  );
}
