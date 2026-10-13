"use client";

import Link from "next/link";
import { useId } from "react";

import { Chip } from "@/components/ui/Chip";
import { formatDate, type NearbyVenue, type NewShow, type Show, type VenueChoice } from "@/lib/entries";
import type { Place, Reading } from "@/lib/import/drafts";
import { DateField } from "../DateField";
import { RatingInput } from "../log/RatingInput";
import { ShowField } from "../log/ShowField";
import { VenueField } from "../log/VenueField";

// One show found by an import, as the review screen holds it. `reading` is
// what the source said; the other fields are what will be saved.
export type Draft = {
  key: string;
  reading: Reading;
  show: Show | NewShow | null;
  venue: VenueChoice | null;
  date: string;
  rating: number | null;
  note: string;
  include: boolean;
  // Low confidence: offered as "Maybe X?" instead of filling the show.
  suggestion: string | null;
  nearby: NearbyVenue[];
  place: Place;
  // Clean 1600px copies, in source order; `photoIndex` picks the one to
  // attach (null: none).
  photos: { stored: Blob; previewUrl: string }[];
  photoIndex: number | null;
  status: "resolving" | "ready" | "saving" | "saved" | "failed";
  entryId?: string;
  error?: string;
};

const CONFIDENCE = {
  high: { text: "Sure", className: "bg-tint-fill text-tint-text" },
  medium: { text: "Probably", className: "bg-fill text-label" },
  low: { text: "Guess", className: "bg-fill text-label-secondary" },
} as const;

const label = "text-subheadline font-medium text-label";

function readLine(d: Draft) {
  const e = d.reading.extracted;
  const when = e.date ? `${formatDate(e.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}${e.time ? `, ${e.time}` : ""}` : null;
  return [e.show_title, e.venue_name ?? (e.venue_osm_id ? "a nearby theatre" : null), [e.city, e.country].filter(Boolean).join(", ") || null, when]
    .filter(Boolean)
    .join(" · ");
}

// What the import read from its sources, and the fields to correct before
// saving. Mobile first: one column, full-width fields, as on the log form.
export function DraftCard({
  draft,
  duplicateOf,
  emailText,
  onChange,
}: {
  draft: Draft;
  // An entry already in the diary for the same show and date.
  duplicateOf: string | null;
  emailText: (ref: string) => string | undefined;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const id = useId();
  const e = draft.reading.extracted;
  const conf = CONFIDENCE[e.confidence];
  const emails = draft.reading.sources.filter((s) => s.kind === "email");
  const locked = draft.status === "saving" || draft.status === "saved";

  if (draft.status === "saved") {
    return (
      <article className="flex items-center gap-3 rounded-md border border-separator bg-surface p-4 shadow-sm">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-tint-fill text-tint-text">
          ✓
        </span>
        <p className="min-w-0 flex-1 truncate text-body text-label">
          <span className="font-semibold">{draft.show?.title}</span>
          <span className="text-label-secondary"> · {draft.date && formatDate(draft.date)}</span>
        </p>
        {draft.entryId && (
          <Link href={`/app/entries/${draft.entryId}`} className="text-subheadline font-semibold text-tint-text hover:underline">
            View
          </Link>
        )}
      </article>
    );
  }

  return (
    <article
      aria-labelledby={`${id}-title`}
      className={`flex flex-col gap-4 rounded-md border bg-surface p-4 shadow-sm ${draft.include ? "border-outline" : "border-separator opacity-80"}`}
    >
      {/* Where it came from, and whether to save it */}
      <header className="flex items-start gap-3">
        {draft.photos.length ? (
          <div className="flex shrink-0 flex-wrap gap-1.5" role="group" aria-label="Photo to attach">
            {draft.photos.map((p, i) => (
              <button
                key={p.previewUrl}
                type="button"
                disabled={locked}
                aria-pressed={draft.photoIndex === i}
                aria-label={`Attach photo ${i + 1}`}
                onClick={() => onChange({ photoIndex: draft.photoIndex === i ? null : i })}
                className={`overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  draft.photoIndex === i ? "ring-2 ring-tint" : "opacity-60"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob */}
                <img src={p.previewUrl} alt="" className="size-14 object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-sm bg-fill text-label-secondary">
            <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="m4 7 8 6 8-6" />
            </svg>
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={`${id}-title`} className="text-headline text-label">
            {e.show_title ?? "Unknown show"}
          </h2>
          {emails.map((s) => (
            <p key={s.ref} className="truncate text-footnote text-label-secondary" title={s.subject ?? s.fileName}>
              {s.subject ?? s.fileName}
              {s.from ? ` · ${s.from.replace(/<[^>]*>/, "").trim()}` : ""}
            </p>
          ))}
          {draft.photos.length > 0 && (
            <p className="text-footnote text-label-secondary">
              {draft.photos.length} photo{draft.photos.length === 1 ? "" : "s"}
              {draft.photos.length > 1 && draft.photoIndex == null ? " · none attached" : ""}
            </p>
          )}
        </div>
        <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-subheadline font-semibold text-label">
          <input
            type="checkbox"
            checked={draft.include}
            disabled={locked}
            onChange={(ev) => onChange({ include: ev.target.checked })}
            className="size-5 accent-[var(--tint)]"
          />
          Save
        </label>
      </header>

      {/* What we read */}
      <div className="flex flex-col gap-1.5 rounded-sm bg-fill px-3 py-2.5">
        <p className="flex flex-wrap items-center gap-2 text-footnote">
          <span className={`rounded-pill px-2 py-0.5 font-semibold ${conf.className}`}>{conf.text}</span>
          <span className="text-label">{readLine(draft) || "Nothing certain"}</span>
        </p>
        {(e.seats || e.price) && (
          <p className="text-footnote text-label-secondary">{[e.seats && `Seats ${e.seats}`, e.price].filter(Boolean).join(" · ")}</p>
        )}
        {e.reason && <p className="text-footnote text-label-secondary">{e.reason}</p>}
      </div>

      {duplicateOf && (
        <p className="text-footnote text-label">
          Already in your diary on this date.{" "}
          <Link href={`/app/entries/${duplicateOf}`} className="font-semibold text-tint-text hover:underline">
            See entry
          </Link>
        </p>
      )}

      {draft.status === "resolving" ? (
        <p className="text-footnote text-label-secondary">Matching to the catalogue…</p>
      ) : (
        <fieldset disabled={locked} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span id={`${id}-show`} className={label}>
              Show
            </span>
            <ShowField labelledBy={`${id}-show`} value={draft.show} onChange={(show) => onChange({ show, suggestion: null })} />
            {draft.suggestion && !draft.show && (
              <div>
                <Chip onClick={() => onChange({ show: { title: draft.suggestion!, type: e.show_type ?? "musical" }, suggestion: null })}>
                  Maybe {draft.suggestion}?
                </Chip>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span id={`${id}-venue`} className={label}>
              Venue
            </span>
            <VenueField
              labelledBy={`${id}-venue`}
              value={draft.venue}
              onChange={(venue) => onChange({ venue })}
              nearby={draft.nearby}
              suggestions={[]}
              place={draft.place}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-date`} className={label}>
              Date
            </label>
            <DateField id={`${id}-date`} value={draft.date} onChange={(date) => onChange({ date })} />
          </div>

          <details className="group">
            <summary className="min-h-11 cursor-pointer py-2 text-subheadline font-semibold text-tint-text">
              Rating and note
              {(draft.rating != null || draft.note) && <span className="font-normal text-label-secondary"> · added</span>}
            </summary>
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-1">
                <span id={`${id}-rating`} className={label}>
                  Rating
                </span>
                <RatingInput labelledBy={`${id}-rating`} value={draft.rating} onChange={(rating) => onChange({ rating })} />
              </div>
              <label className="flex flex-col gap-2">
                <span className={label}>Note</span>
                <textarea
                  rows={3}
                  maxLength={10000}
                  value={draft.note}
                  onChange={(ev) => onChange({ note: ev.target.value })}
                  className="block w-full rounded-md border border-separator bg-surface px-4 py-3 text-body text-label shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                />
              </label>
            </div>
          </details>
        </fieldset>
      )}

      {emails.map((s) => (
        <details key={s.ref}>
          <summary className="min-h-11 cursor-pointer py-2 text-footnote font-semibold text-label-secondary">
            Text read from {s.fileName}
            {s.trimmed ? " (trimmed to the first 30,000 characters)" : ""}
          </summary>
          <pre className="max-h-72 overflow-auto rounded-sm bg-fill p-3 font-sans text-footnote whitespace-pre-wrap text-label">
            {emailText(s.ref) ?? ""}
          </pre>
        </details>
      ))}

      {draft.error && (
        <p role="alert" className="text-footnote text-destructive">
          {draft.error}
        </p>
      )}
    </article>
  );
}
