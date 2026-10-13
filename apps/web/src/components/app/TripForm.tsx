"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { Collection, Visibility } from "@/lib/entries";
import { createClient } from "@/lib/supabase/client";
import { DateField } from "./DateField";
import { fieldClass } from "./log/Typeahead";

const label = "text-subheadline font-medium text-label";

// Create or edit a trip or label: name, kind, optional dates, visibility.
export function TripForm({
  initial,
  defaultVisibility,
  onDone,
}: {
  initial?: Collection;
  defaultVisibility: Visibility;
  onDone?: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<Collection["kind"]>(initial?.kind ?? "trip");
  const [start, setStart] = useState(initial?.start_date ?? "");
  const [end, setEnd] = useState(initial?.end_date ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? defaultVisibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Give it a name.");
    if (start && end && end < start) return setError("The end date is before the start date.");
    setSaving(true);
    const supabase = createClient();
    const fields = {
      name: name.trim(),
      kind,
      start_date: start || null,
      end_date: end || null,
      visibility,
    };
    const { data, error: write } = initial
      ? await supabase.from("collections").update(fields).eq("id", initial.id).select("id").single()
      : await supabase.from("collections").insert(fields).select("id").single();
    if (write || !data) {
      setError("Couldn’t save. Try again.");
      setSaving(false);
      return;
    }
    onDone?.();
    if (initial) {
      setSaving(false);
      router.refresh();
    } else {
      router.push(`/app/trips/${data.id}`);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className={label}>
          Name
        </label>
        <input
          id={`${id}-name`}
          className={fieldClass}
          value={name}
          maxLength={100}
          placeholder={kind === "trip" ? "NYC Oct 2026" : "Fringe favourites"}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div role="radiogroup" aria-label="Kind" className="flex gap-2">
        {(["trip", "label"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-11 flex-1 rounded-pill px-4 text-subheadline font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              kind === k ? "bg-label text-background" : "bg-fill text-label"
            }`}
          >
            {k === "trip" ? "Trip" : "Label"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-start`} className={label}>
            From <span className="font-normal text-label-secondary">(optional)</span>
          </label>
          <DateField id={`${id}-start`} compact placeholder="Start" value={start} onChange={setStart} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-end`} className={label}>
            To <span className="font-normal text-label-secondary">(optional)</span>
          </label>
          <DateField id={`${id}-end`} compact placeholder="End" value={end} min={start || undefined} onChange={setEnd} />
        </div>
      </div>
      {kind === "trip" && (
        <p className="text-footnote text-label-secondary">
          New shows dated within the trip are added to it unless you untick it.
        </p>
      )}
      <div role="radiogroup" aria-label="Who can see this" className="flex gap-2">
        {(["public", "private"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={visibility === v}
            onClick={() => setVisibility(v)}
            className={`min-h-11 flex-1 rounded-pill px-4 text-subheadline font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              visibility === v ? "bg-label text-background" : "bg-fill text-label"
            }`}
          >
            {v === "public" ? "Public" : "Private"}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-footnote text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : initial ? "Save changes" : kind === "trip" ? "Create trip" : "Create label"}
      </Button>
    </form>
  );
}
