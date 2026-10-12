import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/EmptyState";
import { TripForm } from "@/components/app/TripForm";
import { formatDate, type Collection } from "@/lib/entries";
import { ownerContext } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Trips" };

function dates(c: Collection) {
  if (!c.start_date) return null;
  const from = formatDate(c.start_date, { day: "numeric", month: "short" });
  return c.end_date ? `${from} – ${formatDate(c.end_date)}` : `From ${formatDate(c.start_date)}`;
}

async function Trips() {
  const { supabase, userId } = await ownerContext();
  if (!userId) return null;
  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, kind, start_date, end_date, visibility, entry_collections(count)")
      .eq("user_id", userId)
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("default_visibility").eq("id", userId).single(),
  ]);
  const collections = (data ?? []) as (Collection & { entry_collections: { count: number }[] })[];

  return (
    <>
      {collections.length ? (
        <ul className="overflow-hidden rounded-md border border-separator bg-surface shadow-sm">
          {collections.map((c) => {
            const count = c.entry_collections[0]?.count ?? 0;
            return (
              <li key={c.id} className="border-b border-separator last:border-b-0">
                <Link
                  href={`/app/trips/${c.id}`}
                  className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-headline text-label">{c.name}</span>
                    <span className="truncate text-subheadline text-label-secondary">
                      {[c.kind === "trip" ? "Trip" : "Label", dates(c)].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className="shrink-0 text-subheadline tabular-nums text-label-secondary">
                    {count} {count === 1 ? "show" : "shows"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No trips yet">
          Group shows into a trip or festival, like “NYC Oct 2026”, or a label like “Fringe favourites”.
        </EmptyState>
      )}
      <details className="group rounded-md border border-separator bg-surface shadow-sm" open={!collections.length}>
        <summary className="flex min-h-[50px] cursor-pointer list-none items-center px-4 text-headline text-tint-text focus-visible:outline-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
          New trip or label
        </summary>
        <div className="border-t border-separator p-4">
          <TripForm defaultVisibility={profile?.default_visibility ?? "public"} />
        </div>
      </details>
    </>
  );
}

// Trips (with dates) and labels (#14).
export default function TripsPage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-large-title font-display text-label">Trips</h1>
      <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
        <Trips />
      </Suspense>
    </section>
  );
}
