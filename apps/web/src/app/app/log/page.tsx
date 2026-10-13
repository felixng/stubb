import type { Metadata } from "next";

import { EmptyState } from "@/components/app/EmptyState";

export const metadata: Metadata = { title: "Log a show" };

// The log form lands in #14.
export default function LogPage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-large-title font-display text-label">Log a show</h1>
      <EmptyState title="Coming next">
        Pick a show, venue and date, add a rating and a note.
      </EmptyState>
    </section>
  );
}
