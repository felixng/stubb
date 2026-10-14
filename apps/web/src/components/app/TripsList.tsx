import Link from "next/link";

import { EmptyState } from "@/components/app/EmptyState";
import { formatTripDates, TRIP_SELECT, type Collection } from "@/lib/entries";
import { ownerContext } from "@/lib/supabase/data";

// The owner's trips, newest first, on the Profile tab next to the diary.
// Not a tab of their own: most visits aren't part of a trip.
export async function TripsList() {
  const { supabase, userId } = await ownerContext();
  if (!userId) return null;
  const { data } = await supabase
    .from("collections")
    .select(`${TRIP_SELECT}, entry_collections(count)`)
    .eq("user_id", userId)
    .eq("kind", "trip")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });
  const trips = (data ?? []) as (Collection & { entry_collections: { count: number }[] })[];

  if (!trips.length) {
    return (
      <EmptyState title="No trips yet">
        Group shows from a trip or festival, like “NYC Oct 2026”. Pick them in your diary, or start a trip here.
      </EmptyState>
    );
  }
  return (
    <ul className="overflow-hidden rounded-md border border-separator bg-surface shadow-sm">
      {trips.map((t) => {
        const count = t.entry_collections[0]?.count ?? 0;
        return (
          <li key={t.id} className="border-b border-separator last:border-b-0">
            <Link
              href={`/app/trips/${t.id}`}
              className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-headline text-label">{t.name}</span>
                <span className="truncate text-subheadline text-label-secondary">{formatTripDates(t)}</span>
              </div>
              <span className="shrink-0 text-subheadline tabular-nums text-label-secondary">
                {count} {count === 1 ? "show" : "shows"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
