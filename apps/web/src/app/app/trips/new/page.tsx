import type { Metadata } from "next";
import { Suspense } from "react";

import { TripForm } from "@/components/app/TripForm";

export const metadata: Metadata = { title: "New trip" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[0-9a-f-]{36}$/i;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

// ?from=&to= prefill the dates; ?entries= (comma-separated ids, from the
// diary's selection) are added to the trip once it's created.
async function Form({ searchParams }: { searchParams: PageProps<"/app/trips/new">["searchParams"] }) {
  const query = await searchParams;
  const from = one(query.from);
  const to = one(query.to);
  const entryIds = (one(query.entries) ?? "").split(",").filter((id) => ID.test(id));
  return (
    <TripForm
      prefill={{
        start: from && DAY.test(from) ? from : undefined,
        end: to && DAY.test(to) ? to : undefined,
        entryIds,
      }}
    />
  );
}

export default function NewTripPage({ searchParams }: PageProps<"/app/trips/new">) {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-title font-display text-label">New trip</h1>
      <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
