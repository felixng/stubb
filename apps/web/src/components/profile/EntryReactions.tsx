"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { Reactions } from "@/lib/reactions";
import { createClient } from "@/lib/supabase/client";

const ACTION =
  "inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-subheadline font-semibold tabular-nums transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Like and comment, under a public entry, as on Hevy. Liking shows at once and
// writes in the background; the refreshed page then brings the real counts.
// Signed-out visitors go to sign in and come back. Comments live on the
// entry's page (`commentsHref`).
export function EntryReactions({
  entryId,
  reactions,
  viewerId,
  commentsHref,
  loginHref,
}: {
  entryId: string;
  reactions: Reactions;
  viewerId: string | null;
  commentsHref: string;
  loginHref: string;
}) {
  const router = useRouter();
  // The viewer's own like, shown until the refreshed counts arrive. A new
  // `reactions` prop (from the refresh) replaces it.
  const [mine, setMine] = useState<Reactions | null>(null);
  const [shown, setShown] = useState(reactions);
  if (shown !== reactions) {
    setShown(reactions);
    setMine(null);
  }
  const state = mine ?? reactions;
  const writing = useRef(false);

  async function toggle() {
    if (writing.current || !viewerId) return;
    writing.current = true;
    const liked = !state.liked;
    setMine({ ...state, liked, likes: Math.max(0, state.likes + (liked ? 1 : -1)) });
    const supabase = createClient();
    const { error } = liked
      ? await supabase.from("entry_likes").insert({ entry_id: entryId, user_id: viewerId })
      : await supabase.from("entry_likes").delete().eq("entry_id", entryId).eq("user_id", viewerId);
    writing.current = false;
    // A like that already exists (23505) is what was asked for.
    if (error && error.code !== "23505") {
      setMine(null);
      window.alert("Couldn’t update. Try again.");
      return;
    }
    router.refresh();
  }

  const heart = (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" className={state.liked ? "text-tint" : "text-label-secondary"}>
      <path
        d="M12 20.5s-7.5-4.4-9.3-9.2C1.5 7.9 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.4 4.4 6.8-1.8 4.8-9.3 9.2-9.3 9.2Z"
        fill={state.liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
  const likeLabel = `${state.likes} ${state.likes === 1 ? "like" : "likes"}`;

  return (
    <div className="-mx-3 -mb-2 flex items-center gap-1 text-label">
      {viewerId ? (
        <button type="button" onClick={toggle} aria-pressed={state.liked} className={`${ACTION} cursor-pointer`}>
          {heart}
          <span aria-hidden="true">{state.likes > 0 ? state.likes : ""}</span>
          <span className="sr-only">Like ({likeLabel})</span>
        </button>
      ) : (
        <Link href={loginHref} className={ACTION}>
          {heart}
          <span aria-hidden="true">{state.likes > 0 ? state.likes : ""}</span>
          <span className="sr-only">Sign in to like ({likeLabel})</span>
        </Link>
      )}
      <Link href={commentsHref} className={ACTION}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" className="text-label-secondary">
          <path
            d="M4 12c0-4.1 3.6-7.5 8-7.5s8 3.4 8 7.5-3.6 7.5-8 7.5c-1.2 0-2.4-.3-3.4-.7L4 20l1.1-3.6C4.4 15.1 4 13.6 4 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        <span aria-hidden="true">{state.comments > 0 ? state.comments : ""}</span>
        <span className="sr-only">
          Comments ({state.comments} {state.comments === 1 ? "comment" : "comments"})
        </span>
      </Link>
    </div>
  );
}
