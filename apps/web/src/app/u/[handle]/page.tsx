import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Avatar } from "@/components/profile/Avatar";
import { ProfileCalendar } from "@/components/profile/ProfileCalendar";
import { PublicEntryCard } from "@/components/profile/PublicEntryCard";
import { getPublicProfile } from "@/lib/profile";

// Public profile, served at /@handle (rewritten here in next.config.ts).
// Opt-in: only profiles with a handle have one, and it shows public entries
// only. Reads go through the publishable key, never the visitor's session.
// Follows the visitor's light/dark setting (docs/DESIGN.md).

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const data = await getPublicProfile(handle);
  if (!data) return { title: "Not found — Stubbed", robots: { index: false } };
  const { profile, stats } = data;
  const name = profile.display_name ? `${profile.display_name} (@${profile.handle})` : `@${profile.handle}`;
  const description = `${count(stats.shows, "show")} at ${count(stats.venues, "theatre")}. ${name}’s theatre diary on Stubbed.`;
  return {
    title: `${name} — Stubbed`,
    description,
    alternates: { canonical: `/@${profile.handle}` },
    openGraph: { type: "profile", title: name, description, url: `/@${profile.handle}`, username: profile.handle },
  };
}

function count(n: number, noun: string) {
  return `${n} ${n === 1 ? noun : `${noun}s`}`;
}

async function Profile({ params }: PageProps<"/u/[handle]">) {
  const { handle } = await params;
  const data = await getPublicProfile(handle);
  if (!data) notFound();
  const { profile, stats, entries, photos } = data;

  const cover = entries
    .flatMap((e) => (e.photo_path && photos.get(e.photo_path) ? [photos.get(e.photo_path)!] : []))
    .slice(0, 5);
  const name = profile.display_name || `@${profile.handle}`;

  return (
    <>
      <section aria-labelledby="profile-name" className="overflow-hidden rounded-md border border-separator bg-surface shadow-sm">
        {cover.length > 0 ? (
          <div className="flex h-28 gap-0.5 bg-fill sm:h-44">
            {cover.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, EXIF stripped on upload
              <img key={src} src={src} alt="" className={`min-w-0 flex-1 object-cover ${i >= 3 ? "hidden sm:block" : ""}`} />
            ))}
          </div>
        ) : (
          <div aria-hidden="true" className="h-20 bg-tint-fill sm:h-28" />
        )}
        <div className="flex flex-col gap-4 px-4 pb-5 sm:px-6">
          <Avatar name={name} url={profile.avatar_url} size={88} className="-mt-11 ring-4 ring-surface" />
          <div className="flex flex-col gap-0.5">
            <h1 id="profile-name" className="text-title font-display text-label">
              @{profile.handle}
            </h1>
            {profile.display_name && <p className="text-subheadline text-label-secondary">{profile.display_name}</p>}
          </div>
          <dl className="flex gap-8">
            {[
              ["Shows", stats.shows],
              ["Theatres", stats.venues],
              ["Cities", stats.cities],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-footnote text-label-secondary">{label}</dt>
                <dd className="text-title-2 font-display text-label tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-separator bg-surface px-6 py-12 text-center shadow-sm">
          <h2 className="text-headline text-label">No public shows yet</h2>
          <p className="max-w-[320px] text-subheadline text-label-secondary">
            When @{profile.handle} logs a public show, it’ll appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1">
            <ProfileCalendar entries={entries.map((e) => ({ id: e.id, date: e.date, title: e.show.title }))} />
          </div>
          <section aria-labelledby="recent-heading" className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
            <h2 id="recent-heading" className="text-title-2 font-display text-label">
              Recent shows
            </h2>
            {entries.map((e) => (
              <PublicEntryCard
                key={e.id}
                entry={e}
                photoUrl={e.photo_path ? photos.get(e.photo_path) : undefined}
                handle={profile.handle}
                name={name}
                avatarUrl={profile.avatar_url}
              />
            ))}
          </section>
        </div>
      )}
    </>
  );
}

export default function ProfilePage(props: PageProps<"/u/[handle]">) {
  return (
    <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
      <Profile {...props} />
    </Suspense>
  );
}
