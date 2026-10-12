import type { Metadata } from "next";

import { EmptyState } from "@/components/app/EmptyState";

export const metadata: Metadata = { title: "Diary" };

// The diary list lands in #14.
export default function DiaryPage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-large-title font-display text-label">Diary</h1>
      <EmptyState title="No shows yet">
        Every show you log appears here, newest first. Tap Log to add your first.
      </EmptyState>
    </section>
  );
}
