import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/EmptyState";
import { ProfileForm } from "@/components/app/ProfileForm";
import { formatTripDates, TRIP_SELECT, type Collection } from "@/lib/entries";
import { getOwnProfile, ownerContext } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Profile" };

const loading = <p className="text-subheadline text-label-secondary">Loading…</p>;

// The owner's trips, newest first. Trips live here rather than in a tab of
// their own: most visits aren't part of a trip.
async function Trips() {
  const { supabase, userId } = await ownerContext();
  if (!userId) return null;
  const { data } = await supabase
    .from("collections")
    .select(`${TRIP_SELECT}, entry_collections(count)`)
    .eq("user_id", userId)
    .eq("kind", "trip")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });
  const trips = (data ?? []) as (Collection & { entry_collections: { count: number }[] })[];

  if (!trips.length) {
    return (
      <EmptyState title="No trips yet">
        Group shows from a trip or festival, like “NYC Oct 2026”. Pick them in your diary, or start a trip here.
      </EmptyState>
    );
  }
  return (
    <ul className="overflow-hidden rounded-md border border-separator bg-surface shadow-sm">
      {trips.map((t) => {
        const count = t.entry_collections[0]?.count ?? 0;
        return (
          <li key={t.id} className="border-b border-separator last:border-b-0">
            <Link
              href={`/app/trips/${t.id}`}
              className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-headline text-label">{t.name}</span>
                <span className="truncate text-subheadline text-label-secondary">{formatTripDates(t)}</span>
              </div>
              <span className="shrink-0 text-subheadline tabular-nums text-label-secondary">
                {count} {count === 1 ? "show" : "shows"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function Form() {
  const [{ userId }, profile] = await Promise.all([ownerContext(), getOwnProfile()]);
  if (!userId) return null;
  return (
    <ProfileForm
      userId={userId}
      initial={profile ?? { handle: null, display_name: null, bio: null, link: null, avatar_url: null, is_private: false }}
    />
  );
}

// Trips, then everything on the public profile (/@handle) and whether it is private.
export default function ProfilePage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-large-title font-display text-label">Profile</h1>
      <section id="trips" aria-labelledby="trips-heading" className="flex scroll-mt-20 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="trips-heading" className="text-title-2 font-display text-label">
            Trips
          </h2>
          <Link
            href="/app/trips/new"
            className="text-subheadline font-semibold text-tint-text underline-offset-2 hover:underline"
          >
            + New trip
          </Link>
        </div>
        <Suspense fallback={loading}>
          <Trips />
        </Suspense>
      </section>
      <section aria-labelledby="details-heading" className="flex flex-col gap-3 border-t border-separator pt-5">
        <h2 id="details-heading" className="text-title-2 font-display text-label">
          Your details
        </h2>
        <Suspense fallback={loading}>
          <Form />
        </Suspense>
      </section>
    </section>
  );
}
