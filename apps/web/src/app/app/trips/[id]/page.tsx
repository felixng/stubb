import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeleteTripButton } from "@/components/app/DeleteTripButton";
import { EmptyState } from "@/components/app/EmptyState";
import { EntryList } from "@/components/app/EntryList";
import { TripEntries } from "@/components/app/TripEntries";
import { TripForm } from "@/components/app/TripForm";
import { formatTripDates, TRIP_SELECT, tripCovers, type Collection } from "@/lib/entries";
import { listOwnEntries, ownerContext } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Trip" };

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-md border border-separator bg-surface px-2 py-3 shadow-sm">
      <span className="text-title-2 font-display tabular-nums text-label">{value}</span>
      <span className="text-footnote text-label-secondary">{label}</span>
    </div>
  );
}

async function Trip({ params, searchParams }: PageProps<"/app/trips/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, userId } = await ownerContext();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await supabase
    .from("collections")
    .select(TRIP_SELECT)
    .eq("id", id)
    .eq("user_id", userId)
    .eq("kind", "trip")
    .maybeSingle();
  if (!data) notFound();
  const trip = data as Collection;

  const { entries: all, photos } = await listOwnEntries();
  // Date order within a trip, oldest first: it reads like an itinerary.
  const entries = all.filter((e) => e.collections.some((c) => c.id === trip.id)).reverse();
  // Only shows dated within the trip can join it.
  const others = all.filter((e) => !e.collections.some((c) => c.id === trip.id) && tripCovers(trip, e.date));
  // Stats count shows seen; planned ones are listed but not counted yet.
  const seen = entries.filter((e) => e.status === "logged");
  const venues = new Set(seen.flatMap((e) => (e.venue ? [e.venue.id] : []))).size;
  const nights = new Set(seen.map((e) => e.date)).size;
  const pickable = (list: typeof all) =>
    list.map((e) => ({ id: e.id, title: e.show.title, venue: e.venue?.name ?? null, date: e.date }));

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-display text-label">{trip.name}</h1>
        <p className="text-subheadline text-label-secondary">{formatTripDates(trip)}</p>
      </header>
      {query.added === "failed" && (
        <p role="alert" className="rounded-md bg-fill px-4 py-3 text-subheadline text-destructive">
          Trip created, but the shows you picked weren’t added. Add them below.
        </p>
      )}
      <div className="flex gap-3">
        <Stat value={seen.length} label={seen.length === 1 ? "show" : "shows"} />
        <Stat value={venues} label={venues === 1 ? "venue" : "venues"} />
        <Stat value={nights} label={nights === 1 ? "night" : "nights"} />
      </div>
      {entries.length ? (
        <EntryList entries={entries} photos={photos} />
      ) : (
        <EmptyState title="No shows in this trip yet">
          Add shows dated within the trip, or plan one: it’s offered this trip when its date falls inside.
        </EmptyState>
      )}
      <TripEntries tripId={trip.id} inTrip={pickable(entries)} others={pickable(others)} />
      <details className="rounded-md border border-separator bg-surface shadow-sm">
        <summary className="flex min-h-[50px] cursor-pointer list-none items-center px-4 text-headline text-tint-text focus-visible:outline-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
          Edit trip
        </summary>
        <div className="border-t border-separator p-4">
          <TripForm initial={trip} />
        </div>
      </details>
      <DeleteTripButton id={trip.id} />
    </section>
  );
}

export default function TripPage(props: PageProps<"/app/trips/[id]">) {
  return (
    <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
      <Trip {...props} />
    </Suspense>
  );
}
