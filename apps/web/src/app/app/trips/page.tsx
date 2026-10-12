import type { Metadata } from "next";

import { EmptyState } from "@/components/app/EmptyState";

export const metadata: Metadata = { title: "Trips" };

// Trips and labels land in #14.
export default function TripsPage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-large-title font-display text-label">Trips</h1>
      <EmptyState title="No trips yet">
        Group shows into a trip or festival, then share the recap.
      </EmptyState>
    </section>
  );
}
