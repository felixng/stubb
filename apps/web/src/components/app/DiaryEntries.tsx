"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { formatDate, formatTripDates, tripCovers, type Collection, type EntryRow } from "@/lib/entries";
import { createClient } from "@/lib/supabase/client";
import { EntryList } from "./EntryList";

// The diary's tracked shows, with a select mode for grouping several into a
// trip: an existing trip that covers all their dates, or a new one with its
// dates prefilled to fit. Hidden until "Select" is tapped, so the diary stays
// plain for the many visits that aren't part of a trip.
export function DiaryEntries({
  entries,
  photos,
  trips,
}: {
  entries: EntryRow[];
  photos: Record<string, string>;
  trips: Collection[];
}) {
  const router = useRouter();
  const photoMap = useMemo(() => new Map(Object.entries(photos)), [photos]);
  const [selecting, setSelecting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = entries.filter((e) => picked.includes(e.id));
  const dates = chosen.map((e) => e.date).sort();
  const covering = trips.filter((t) => dates.every((d) => tripCovers(t, d)));
  const others = trips.filter((t) => !covering.includes(t));

  function reset() {
    setSelecting(false);
    setPicking(false);
    setPicked([]);
    setError(null);
  }

  async function addTo(trip: Collection) {
    setBusy(true);
    setError(null);
    const { error: write } = await createClient()
      .from("entry_collections")
      .upsert(
        picked.map((entry_id) => ({ entry_id, collection_id: trip.id })),
        { ignoreDuplicates: true },
      );
    setBusy(false);
    if (write) return setError("Couldn’t add them to the trip. Try again.");
    reset();
    router.push(`/app/trips/${trip.id}`);
  }

  const newTripHref = `/app/trips/new?${new URLSearchParams({
    from: dates[0] ?? "",
    to: dates[dates.length - 1] ?? "",
    entries: picked.join(","),
  })}`;

  if (!selecting) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setSelecting(true)}>
            Select
          </Button>
        </div>
        <EntryList entries={entries} photos={photoMap} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-subheadline text-label-secondary" aria-live="polite">
          {picked.length ? `${picked.length} selected` : "Pick shows to group into a trip"}
        </p>
        <Button variant="ghost" size="sm" onClick={reset}>
          Cancel
        </Button>
      </div>
      <fieldset>
        <legend className="sr-only">Shows to add to a trip</legend>
        <ul className="overflow-hidden rounded-md border border-separator bg-surface shadow-sm">
          {entries.map((e) => (
            <li key={e.id} className="border-b border-separator last:border-b-0">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-fill">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--tint)]"
                  checked={picked.includes(e.id)}
                  onChange={() => {
                    setPicking(false);
                    setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]));
                  }}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body text-label">{e.show.title}</span>
                  <span className="truncate text-footnote text-label-secondary">
                    {[e.venue?.name, formatDate(e.date)].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {/* Sits on the tab bar (49px), like the log form's Save. */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+49px)] z-10 -mx-4 flex flex-col gap-3 bg-background/90 px-4 pt-3 pb-4 backdrop-blur">
        {picking && picked.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-separator bg-surface p-3 shadow-sm">
            <p className="text-subheadline font-medium text-label">Add to</p>
            <ul className="flex flex-col gap-1">
              {covering.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addTo(t)}
                    className="flex min-h-11 w-full cursor-pointer flex-col items-start justify-center rounded-sm px-2 text-left hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-40"
                  >
                    <span className="text-body text-label">{t.name}</span>
                    <span className="text-footnote text-label-secondary">{formatTripDates(t)}</span>
                  </button>
                </li>
              ))}
              <li>
                <Link
                  href={newTripHref}
                  className="flex min-h-11 items-center rounded-sm px-2 text-body font-semibold text-tint-text hover:bg-fill focus-visible:outline-2 focus-visible:outline-focus"
                >
                  + New trip ({formatTripDates({ start_date: dates[0], end_date: dates[dates.length - 1] })})
                </Link>
              </li>
            </ul>
            {others.length > 0 && (
              <p className="text-footnote text-label-secondary">
                {others.length === 1 ? `“${others[0].name}” doesn’t` : `${others.length} other trips don’t`} cover all
                these dates. A trip only holds shows within its dates.
              </p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="text-footnote text-destructive">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={!picked.length || busy} onClick={() => setPicking((p) => !p)}>
          {picked.length ? `Add ${picked.length} to a trip` : "Pick shows"}
        </Button>
      </div>
    </div>
  );
}
