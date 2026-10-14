import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/EmptyState";
import { EntryList } from "@/components/app/EntryList";
import { listOwnEntries } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Diary" };

async function Diary() {
  const { entries, photos } = await listOwnEntries();
  if (!entries.length) {
    return (
      <EmptyState title="No shows yet">
        <Link href="/app/log" className="font-semibold text-tint-text underline-offset-2 hover:underline">
          Add your first theatre visit
        </Link>
        . Start with a photo from the show and we’ll fill in what we can.
      </EmptyState>
    );
  }
  return <EntryList entries={entries} photos={photos} />;
}

// The owner's diary, newest first (#14).
export default function DiaryPage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-title font-display text-label">Diary</h1>
      <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
        <Diary />
      </Suspense>
    </section>
  );
}
