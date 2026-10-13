"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { Collection } from "@/lib/entries";
import type { Identification } from "@/lib/identify";
import {
  centroid,
  groupPhotos,
  MAX_IDENTIFY_PHOTOS,
  mergeReadings,
  pickSpread,
  type Extracted,
  type PhotoSource,
  type Reading,
} from "@/lib/import/drafts";
import { EMAIL_FILE_ACCEPT, parseEmailFile, type ParsedEmail } from "@/lib/import/email-parse";
import type { EmailExtraction } from "@/lib/import/extract-email";
import { lookupNearby, preparePhoto, requestIdentify, type PreparedPhoto } from "@/lib/import/photo-pipeline";
import { resolveShow, resolveVenue, runPool, saveDraft, SaveError } from "@/lib/import/resolve";
import { createClient } from "@/lib/supabase/client";
import { DraftCard, type Draft } from "./DraftCard";

// One thing being read: an email, or a group of photos from one visit.
type Job = {
  ref: string;
  kind: "email" | "photos";
  label: string;
  detail: string | null;
  state: "queued" | "reading" | "nearby" | "identifying" | "done" | "failed";
  found: number;
};

type PhotoItem = PreparedPhoto & { ref: string; fileName: string; previewUrl: string };

const STATE_TEXT: Record<Job["state"], string> = {
  queued: "Waiting",
  reading: "Reading",
  nearby: "Finding nearby theatres",
  identifying: "Working out the show",
  done: "Done",
  failed: "Failed",
};

// Claude calls run a few at a time: quick enough, and gentle on rate limits.
const EMAIL_CONCURRENCY = 3;
const PHOTO_CONCURRENCY = 2;

const isImage = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(f.name);

// A photo's own time isn't the curtain time, so `time` stays empty: it would
// stop the draft merging with the booking email for the same show.
function fromIdentification(result: Identification | null, date: string | null, reason?: string): Extracted {
  return {
    show_title: result?.show_title ?? null,
    show_type: result?.show_type ?? null,
    venue_name: result?.venue_name ?? null,
    venue_osm_id: result?.venue_osm_id ?? null,
    city: null,
    country: null,
    date,
    time: null,
    seats: null,
    price: null,
    confidence: result?.confidence ?? "low",
    reason: result?.reason || reason || "",
  };
}

// Bulk import (#17, #18): drop exported confirmation emails or a set of
// photos, see what was read from each, correct the drafts, and save the ones
// you tick. Nothing is written until "Save". Built from the shared
// lib/import steps so a mobile-first flow can reuse them.
export function ImportTool() {
  const id = useId();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [emails, setEmails] = useState<Map<string, ParsedEmail>>(new Map());
  const [pasted, setPasted] = useState("");
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [existing, setExisting] = useState<{ id: string; date: string; show_id: string }[]>([]);
  const [visibility, setVisibility] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Unique refs across several drops in one session.
  const seq = useRef(0);
  // Latest drafts for async steps (merging into a draft added meanwhile).
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const urls = useRef<string[]>([]);
  const existingRef = useRef(existing);
  existingRef.current = existing;

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: claims } = await supabase.auth.getClaims();
      const uid = claims?.claims?.sub;
      if (!uid) return;
      setUserId(uid);
      const [profile, cols, entries] = await Promise.all([
        supabase.from("profiles").select("default_visibility").eq("id", uid).single(),
        supabase
          .from("collections")
          .select("id, name, kind, start_date, end_date, visibility")
          .eq("user_id", uid)
          .order("start_date", { ascending: false, nullsFirst: false }),
        supabase.from("entries").select("id, date, show_id").eq("user_id", uid),
      ]);
      setVisibility(profile.data?.default_visibility ?? null);
      setCollections((cols.data as Collection[] | null) ?? []);
      setExisting((entries.data as typeof existing | null) ?? []);
    })();
  }, []);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const updateJob = (ref: string, patch: Partial<Job>) =>
    setJobs((js) => js.map((j) => (j.ref === ref ? { ...j, ...patch } : j)));
  const updateDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  // A new reading either joins a draft for the same show and date (a
  // reminder for a booking already read) or becomes a new draft, which is
  // then matched to the catalogue.
  async function addReading(reading: Reading, extra: Pick<Draft, "nearby" | "place" | "photos">) {
    const same = draftsRef.current.find(
      (d) => d.status !== "saved" && mergeReadings([d.reading, reading]).length === 1,
    );
    if (same) {
      // Functional update: other jobs may be updating drafts at the same time.
      setDrafts((ds) =>
        ds.map((d) =>
          d.key === same.key
            ? { ...d, reading: mergeReadings([d.reading, reading])[0], photos: [...d.photos, ...extra.photos] }
            : d,
        ),
      );
      return;
    }
    const e = reading.extracted;
    const key = `draft-${++seq.current}`;
    const draft: Draft = {
      key,
      reading,
      show: null,
      venue: null,
      date: e.date ?? "",
      rating: null,
      note: "",
      include: false,
      suggestion: null,
      ...extra,
      photoIndex: extra.photos.length ? 0 : null,
      status: "resolving",
    };
    // The ref is updated now so a reading arriving before the next render
    // still finds this draft to merge into.
    draftsRef.current = [...draftsRef.current, draft];
    setDrafts((ds) => [...ds, draft]);

    const supabase = createClient();
    // Same rule as the log form: low confidence never fills a field.
    const confident = e.confidence !== "low";
    const [show, venue] = await Promise.all([
      confident ? resolveShow(supabase, e) : Promise.resolve(null),
      resolveVenue(supabase, confident ? e : { ...e, venue_name: null, venue_osm_id: null }, extra.nearby, extra.place),
    ]);
    const duplicate = Boolean(show?.id && existingRef.current.some((x) => x.show_id === show.id && x.date === e.date));
    updateDraft(key, {
      show,
      venue,
      suggestion: !confident && e.show_title ? e.show_title : null,
      include: Boolean(show && venue && e.date && !duplicate),
      status: "ready",
    });
  }

  async function readEmails(files: File[], text?: string) {
    const parsed: ParsedEmail[] = [];
    for (const f of files) {
      try {
        if (/\.msg$/i.test(f.name)) throw new Error("Outlook .msg files aren’t supported; save as .eml instead.");
        parsed.push(...parseEmailFile(f.name, await f.text()));
      } catch (err) {
        const ref = `${f.name}@${++seq.current}`;
        setJobs((js) => [...js, { ref, kind: "email", label: f.name, detail: err instanceof Error ? err.message : "Unreadable file", state: "failed", found: 0 }]);
      }
    }
    if (text?.trim()) parsed.push(...parseEmailFile(`Pasted email ${++seq.current}`, text));
    // Unique refs even when the same file is dropped twice.
    const batch = parsed.map((p) => ({ ...p, ref: `${p.ref}@${++seq.current}` }));
    setEmails((m) => new Map([...m, ...batch.map((p) => [p.ref, p] as const)]));
    setJobs((js) => [
      ...js,
      ...batch.map((p): Job => ({
        ref: p.ref,
        kind: "email",
        label: p.subject ?? p.fileName,
        detail: p.text ? null : "No readable text",
        state: p.text ? "queued" : "failed",
        found: 0,
      })),
    ]);

    await runPool(batch.filter((p) => p.text), EMAIL_CONCURRENCY, async (email) => {
      updateJob(email.ref, { state: "reading" });
      try {
        const res = await fetch("/api/import/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: email.subject, from: email.from, sent: email.sent, text: email.text }),
        });
        if (!res.ok) {
          const error = res.status === 503 ? "Import isn’t set up yet (no API key)." : res.status === 429 ? "Too many at once. Try again in a few minutes." : "Couldn’t read this email.";
          updateJob(email.ref, { state: "failed", detail: error });
          return;
        }
        const { result } = (await res.json()) as { result: EmailExtraction | null };
        const shows = result?.shows ?? [];
        updateJob(email.ref, {
          state: "done",
          found: shows.length,
          detail:
            result?.kind === "not_a_booking" || !shows.length
              ? "No booking found"
              : result?.kind && result.kind !== "booking"
                ? `${result.kind[0].toUpperCase()}${result.kind.slice(1)}`
                : null,
        });
        const source = { kind: "email" as const, ref: email.ref, fileName: email.fileName, subject: email.subject, from: email.from, sent: email.sent, trimmed: email.trimmed };
        for (const extracted of shows) {
          await addReading({ extracted, sources: [source] }, { nearby: [], place: { city: extracted.city, country: extracted.country }, photos: [] });
        }
      } catch {
        updateJob(email.ref, { state: "failed", detail: "Couldn’t read this email." });
      }
    });
  }

  async function readPhotos(files: File[]) {
    // Read and re-encode every photo on the device first, so they can be
    // grouped by visit before any Claude call.
    const items: PhotoItem[] = [];
    const prepRef = `prep@${++seq.current}`;
    setJobs((js) => [...js, { ref: prepRef, kind: "photos", label: `${files.length} photo${files.length === 1 ? "" : "s"}`, detail: null, state: "reading", found: 0 }]);
    const failed: string[] = [];
    await runPool(files, 3, async (file) => {
      try {
        const prepared = await preparePhoto(file);
        const previewUrl = URL.createObjectURL(prepared.stored);
        urls.current.push(previewUrl);
        items.push({ ...prepared, ref: `${file.name}@${++seq.current}`, fileName: file.name, previewUrl });
      } catch {
        failed.push(file.name);
      }
    });
    const groups = groupPhotos(items.map((p) => ({ ...p, ...p.meta })));
    updateJob(prepRef, {
      state: failed.length && !items.length ? "failed" : "done",
      label: `${items.length} photo${items.length === 1 ? "" : "s"} read, ${groups.length} visit${groups.length === 1 ? "" : "s"}`,
      detail: failed.length
        ? `Couldn’t open ${failed.join(", ")}. HEIC only opens in Safari; export as JPEG for other browsers.`
        : null,
    });

    const groupJobs = groups.map((g) => {
      const first = g[0];
      const when = first.date ? `${first.date}${first.time ? ` ${first.time}` : ""}` : "No date";
      return { ref: `visit-${++seq.current}`, group: g, label: `${when} · ${g.length} photo${g.length === 1 ? "" : "s"}` };
    });
    setJobs((js) => [
      ...js,
      ...groupJobs.map((j): Job => ({ ref: j.ref, kind: "photos", label: j.label, detail: null, state: "queued", found: 0 })),
    ]);

    await runPool(groupJobs, PHOTO_CONCURRENCY, async ({ ref, group }) => {
      const point = centroid(group);
      const dated = group.find((p) => p.date) ?? group[0];
      let nearby: Draft["nearby"] = [];
      let place: Draft["place"] = { city: null, country: null };
      if (point) {
        updateJob(ref, { state: "nearby" });
        ({ candidates: nearby, place } = await lookupNearby(point.lat, point.lng));
      }
      updateJob(ref, { state: "identifying" });
      const outcome = await requestIdentify({
        photos: pickSpread(group, MAX_IDENTIFY_PHOTOS).map((p) => p.small),
        meta: dated.meta,
        point,
        place,
        candidates: nearby,
      });
      const where = [place.city, nearby.length ? `${nearby.length} theatre${nearby.length === 1 ? "" : "s"} nearby` : point ? "no theatre found nearby" : "no location in photo"]
        .filter(Boolean)
        .join(" · ");
      updateJob(ref, {
        state: outcome.error ? "failed" : "done",
        found: outcome.result?.show_title ? 1 : 0,
        detail: outcome.error === "not_configured" ? "Show detection isn’t set up yet (no API key)." : outcome.error ? "Couldn’t work out the show." : where,
      });
      const sources: PhotoSource[] = group.map((p) => ({
        kind: "photo",
        ref: p.ref,
        fileName: p.fileName,
        previewUrl: p.previewUrl,
        date: p.meta.date,
        time: p.meta.time,
        hasLocation: p.meta.lat != null,
      }));
      const extracted = fromIdentification(outcome.result, dated.meta.date, outcome.result ? undefined : "Couldn’t tell the show from these photos.");
      await addReading(
        { extracted: { ...extracted, city: place.city, country: place.country }, sources },
        { nearby, place, photos: group.map((p) => ({ stored: p.stored, previewUrl: p.previewUrl })) },
      );
    });
  }

  function onFiles(list: FileList | File[]) {
    const files = [...list];
    setNotice(null);
    const photos = files.filter(isImage);
    const others = files.filter((f) => !isImage(f));
    if (photos.length) void readPhotos(photos);
    if (others.length) void readEmails(others);
  }

  const duplicateOf = (d: Draft) =>
    (d.show?.id && d.date && existing.find((x) => x.show_id === d.show!.id && x.date === d.date)?.id) || null;

  const toSave = drafts.filter((d) => d.include && d.status !== "saved" && d.status !== "resolving");
  const busy = jobs.some((j) => j.state !== "done" && j.state !== "failed");

  async function saveAll() {
    if (!userId) return setNotice("You’re signed out. Sign in again to save.");
    const incomplete = toSave.filter((d) => !d.show || !d.venue || !d.date);
    if (incomplete.length) {
      incomplete.forEach((d) => updateDraft(d.key, { error: "Needs a show, venue and date, or untick Save." }));
      return setNotice(`${incomplete.length} ticked draft${incomplete.length === 1 ? " is" : "s are"} missing a show, venue or date.`);
    }
    const handAdded = toSave.filter((d) => d.venue && !d.venue.id && !d.venue.osm_id && (!d.venue.city?.trim() || !d.venue.country?.trim()));
    if (handAdded.length) {
      handAdded.forEach((d) => updateDraft(d.key, { error: "Add the new venue’s city and country." }));
      return setNotice("Some new venues need a city and country.");
    }

    setSaving(true);
    setNotice(null);
    const supabase = createClient();
    let saved = 0;
    let photoFailures = 0;
    // One at a time, so two drafts for the same new show or venue reuse the
    // row the first one created instead of adding a duplicate.
    for (const d of toSave) {
      updateDraft(d.key, { status: "saving", error: undefined });
      try {
        const photo = d.photoIndex != null ? (d.photos[d.photoIndex]?.stored ?? null) : null;
        const result = await saveDraft(supabase, userId, {
          show: d.show!,
          venue: d.venue!,
          date: d.date,
          rating: d.rating,
          note: d.note,
          collectionIds,
          photo,
        });
        saved++;
        if (result.photoFailed) photoFailures++;
        updateDraft(d.key, { status: "saved", entryId: result.id });
        // A later import of the same email or photo is then flagged as a duplicate.
        if (d.show?.id) setExisting((xs) => [...xs, { id: result.id, date: d.date, show_id: d.show!.id! }]);
      } catch (err) {
        updateDraft(d.key, { status: "failed", error: err instanceof SaveError ? err.message : String(err) });
      }
    }
    setSaving(false);
    setNotice(
      `Saved ${saved} of ${toSave.length}.${photoFailures ? ` ${photoFailures} photo${photoFailures === 1 ? "" : "s"} didn’t upload; add them from the entry.` : ""}`,
    );
  }

  function reset() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setJobs([]);
    setDrafts([]);
    draftsRef.current = [];
    setEmails(new Map());
    setNotice(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sources */}
      <section aria-labelledby={`${id}-add`} className="flex flex-col gap-3">
        <h2 id={`${id}-add`} className="text-title-2 font-display text-label">
          Add emails or photos
        </h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-3 rounded-md border border-dashed px-6 py-8 text-center shadow-sm ${
            dragging ? "border-tint bg-tint-fill" : "border-outline bg-surface"
          }`}
        >
          <p className="text-headline text-label">Drop files here</p>
          <p className="max-w-[420px] text-subheadline text-label-secondary">
            Confirmation emails saved as .eml, an .mbox export, or a saved .html page. Or photos from the theatre: we read their date and location, and group shots from the same visit.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-pill bg-tint-fill px-4 text-[15px] leading-5 font-semibold text-tint-text hover:bg-fill focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
              Choose emails
              <input
                type="file"
                multiple
                accept={EMAIL_FILE_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-pill bg-tint-fill px-4 text-[15px] leading-5 font-semibold text-tint-text hover:bg-fill focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
              Choose photos
              <input
                type="file"
                multiple
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-subheadline font-semibold text-tint-text">Or paste an email</summary>
          <div className="flex flex-col gap-2 pt-1">
            <label htmlFor={`${id}-paste`} className="sr-only">
              Email text
            </label>
            <textarea
              id={`${id}-paste`}
              rows={6}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste the whole confirmation email"
              className="block w-full rounded-md border border-separator bg-surface px-4 py-3 text-body text-label shadow-sm placeholder:text-label-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              disabled={!pasted.trim()}
              onClick={() => {
                void readEmails([], pasted);
                setPasted("");
              }}
            >
              Read email
            </Button>
          </div>
        </details>
      </section>

      {/* What we read from each source */}
      {jobs.length > 0 && (
        <section aria-labelledby={`${id}-read`} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${id}-read`} className="text-title-2 font-display text-label">
              What we read
            </h2>
            {!busy && !saving && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Start over
              </Button>
            )}
          </div>
          <ul className="overflow-hidden rounded-md border border-separator bg-surface shadow-sm" aria-live="polite">
            {jobs.map((j) => (
              <li key={j.ref} className="flex items-start gap-3 border-b border-separator px-4 py-3 last:border-b-0">
                <span aria-hidden="true" className="mt-1 flex size-4 shrink-0 items-center justify-center">
                  {j.state === "done" ? (
                    <span className="text-tint-text">✓</span>
                  ) : j.state === "failed" ? (
                    <span className="text-destructive">!</span>
                  ) : j.state === "queued" ? (
                    <span className="size-2 rounded-full bg-outline" />
                  ) : (
                    <span className="size-3 animate-spin rounded-full border-2 border-outline border-t-transparent" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-label">{j.label}</p>
                  <p className={`text-footnote ${j.state === "failed" ? "text-destructive" : "text-label-secondary"}`}>
                    {j.state === "done"
                      ? [j.found ? `${j.found} show${j.found === 1 ? "" : "s"} found` : null, j.detail].filter(Boolean).join(" · ") || "Done"
                      : j.state === "failed"
                        ? (j.detail ?? "Failed")
                        : STATE_TEXT[j.state]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Drafts to review */}
      {drafts.length > 0 && (
        <section aria-labelledby={`${id}-review`} className="flex flex-col gap-3">
          <h2 id={`${id}-review`} className="text-title-2 font-display text-label">
            Review {drafts.length} show{drafts.length === 1 ? "" : "s"}
          </h2>
          <p className="text-footnote text-label-secondary">
            Ticked shows are saved; nothing is saved until you press Save. Guesses aren’t filled in: tap “Maybe…” to use one.
          </p>
          {drafts.map((d) => (
            <DraftCard
              key={d.key}
              draft={d}
              duplicateOf={duplicateOf(d)}
              emailText={(ref) => emails.get(ref)?.text}
              onChange={(patch) => updateDraft(d.key, { ...patch, ...(d.error ? { error: undefined } : {}) })}
            />
          ))}

          {collections.length > 0 && (
            <div className="flex flex-col gap-2 pt-2">
              <span id={`${id}-trips`} className="text-subheadline font-medium text-label">
                Add saved shows to
              </span>
              <div role="group" aria-labelledby={`${id}-trips`} className="flex flex-wrap gap-2">
                {collections.map((c) => (
                  <Chip
                    key={c.id}
                    selected={collectionIds.includes(c.id)}
                    onClick={() =>
                      setCollectionIds((ids) => (ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id]))
                    }
                  >
                    {c.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {notice && (
        <p role="status" className="text-footnote text-label">
          {notice}
        </p>
      )}

      {drafts.length > 0 && (
        // Sits on the tab bar (49px), like the log form's Save.
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+49px)] z-10 -mx-4 flex flex-col gap-1 bg-background/90 px-4 pt-3 pb-7 backdrop-blur">
          <Button className="w-full" disabled={saving || !toSave.length} onClick={() => void saveAll()}>
            {saving ? "Saving…" : toSave.length ? `Save ${toSave.length} show${toSave.length === 1 ? "" : "s"}` : "Tick shows to save"}
          </Button>
          {visibility && (
            <p className="text-center text-footnote text-label-secondary">
              Saved as {visibility}, your default. Change any entry afterwards.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
