"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { Avatar } from "@/components/profile/Avatar";
import type { FollowStatus } from "@/lib/follows";
import { createClient } from "@/lib/supabase/client";
import { FollowButton } from "./FollowButton";

type Person = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  status: FollowStatus | null;
};

// Find people by handle or name (search_profiles in Postgres), each with a
// Follow button. Yourself is left out. A search left half-typed is kept if
// you tap away and back.
export function PeopleSearch({ userId }: { userId: string }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ q: string; people: Person[] } | null>(null);
  const [failed, setFailed] = useState(false);
  // Bumped after a follow or unfollow, to read the statuses again.
  const [round, setRound] = useState(0);
  const query = q.trim().replace(/^@/, "");

  useEffect(() => {
    if (query.length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("search_profiles", { q: query });
      if (stale) return;
      if (error) {
        setFailed(true);
        return;
      }
      const people = ((data ?? []) as Omit<Person, "status">[]).filter((p) => p.id !== userId);
      const { data: mine } = people.length
        ? await supabase.from("follows").select("followee_id, status").eq("follower_id", userId).in("followee_id", people.map((p) => p.id))
        : { data: [] };
      if (stale) return;
      const status = new Map((mine ?? []).map((f) => [f.followee_id as string, f.status as FollowStatus]));
      setFailed(false);
      setResults({ q: query, people: people.map((p) => ({ ...p, status: status.get(p.id) ?? null })) });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, userId, round]);

  const shown = query.length >= 2 && results?.q === query ? results.people : null;

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`${id}-q`} className="sr-only">
        Search by handle or name
      </label>
      <input
        id={`${id}-q`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by @handle or name"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className="min-h-11 rounded-md border border-separator bg-surface px-4 text-body text-label placeholder:text-label-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <div aria-live="polite" className="flex flex-col">
        {failed ? (
          <p className="text-subheadline text-destructive">Couldn’t search. Try again.</p>
        ) : shown == null ? (
          query.length >= 2 && <p className="text-subheadline text-label-secondary">Searching…</p>
        ) : shown.length === 0 ? (
          <p className="text-subheadline text-label-secondary">No one matches “{query}”.</p>
        ) : (
          <ul className="overflow-hidden rounded-md border border-separator bg-surface shadow-sm">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-separator px-4 py-3 last:border-b-0">
                <Link href={`/@${p.handle}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                  <Avatar name={p.display_name || p.handle} url={p.avatar_url} size={40} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-subheadline font-semibold text-label">@{p.handle}</span>
                    {(p.display_name || p.is_private) && (
                      <span className="truncate text-footnote text-label-secondary">
                        {[p.display_name, p.is_private ? "Private" : null].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                </Link>
                <FollowButton
                  profileId={p.id}
                  handle={p.handle}
                  isPrivate={p.is_private}
                  viewer={{ id: userId, isOwner: false, status: p.status }}
                  onChanged={() => setRound((r) => r + 1)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
