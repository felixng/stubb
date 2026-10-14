"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/entries";
import { createClient } from "@/lib/supabase/client";

type Pickable = { id: string; title: string; venue: string | null; date: string };

// Add several diary entries to a trip at once, or take them out. Only shows
// dated within the trip are offered, all ticked to start with.
export function TripEntries({
  tripId,
  inTrip,
  others,
}: {
  tripId: string;
  inTrip: Pickable[];
  others: Pickable[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "add" | "remove">("idle");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = mode === "add" ? others : inTrip;

  async function apply() {
    if (!picked.length) return setMode("idle");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: write } =
      mode === "add"
        ? await supabase.from("entry_collections").insert(picked.map((entry_id) => ({ entry_id, collection_id: tripId })))
        : await supabase.from("entry_collections").delete().eq("collection_id", tripId).in("entry_id", picked);
    setBusy(false);
    if (write) return setError("Couldn’t update the trip. Try again.");
    setPicked([]);
    setMode("idle");
    router.refresh();
  }

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap gap-2">
        {others.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setPicked(others.map((e) => e.id));
              setMode("add");
            }}
          >
            Add shows
          </Button>
        )}
        {inTrip.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMode("remove")}>
            Remove shows
          </Button>
        )}
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="pb-2 text-headline text-label">
        {mode === "add" ? "Shows within the trip’s dates" : "Remove from this trip"}
      </legend>
      <ul className="max-h-96 overflow-y-auto rounded-md border border-separator bg-surface shadow-sm">
        {list.map((e) => (
          <li key={e.id} className="border-b border-separator last:border-b-0">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-fill">
              <input
                type="checkbox"
                className="size-5 accent-[var(--tint)]"
                checked={picked.includes(e.id)}
                onChange={() => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body text-label">{e.title}</span>
                <span className="truncate text-footnote text-label-secondary">
                  {[e.venue, formatDate(e.date)].filter(Boolean).join(" · ")}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-footnote text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={apply} disabled={busy || !picked.length}>
          {mode === "add" ? `Add ${picked.length || ""}`.trim() : `Remove ${picked.length || ""}`.trim()}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPicked([]);
            setMode("idle");
          }}
        >
          Cancel
        </Button>
      </div>
    </fieldset>
  );
}
