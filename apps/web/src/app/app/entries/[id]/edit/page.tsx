import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LogForm } from "@/components/app/log/LogForm";
import { getOwnEntry } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Edit entry" };

async function Edit({ params }: { params: PageProps<"/app/entries/[id]/edit">["params"] }) {
  const { id } = await params;
  const found = await getOwnEntry(id);
  if (!found) notFound();
  const { entry, photoUrl } = found;
  return (
    <LogForm
      initial={{
        id: entry.id,
        show: entry.show,
        venue: entry.venue,
        date: entry.date,
        rating: entry.rating,
        note: entry.note,
        visibility: entry.visibility,
        collectionIds: entry.collections.map((c) => c.id),
        photoUrl,
        photoPath: entry.photo_path,
      }}
    />
  );
}

export default function EditEntryPage({ params }: PageProps<"/app/entries/[id]/edit">) {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-title font-display text-label">Edit entry</h1>
      <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
        <Edit params={params} />
      </Suspense>
    </section>
  );
}
