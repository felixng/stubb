"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { fieldClass } from "@/components/app/log/Typeahead";
import { Button } from "@/components/ui/Button";
import { COMMENT_MAX } from "@/lib/reactions";
import { createClient } from "@/lib/supabase/client";

// Adds a comment to a public entry. Postgres checks the viewer may see the
// entry. The box clears once the comment is saved, and the refreshed page
// shows it in the thread; until then the button stays busy. A half-written
// comment survives a stray tab tap (the page is kept, not unmounted).
export function CommentForm({ entryId, viewerId }: { entryId: string; viewerId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const busy = saving || refreshing;
  const text = body.trim();

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!text || busy) return;
    setSaving(true);
    const { error } = await createClient()
      .from("entry_comments")
      .insert({ entry_id: entryId, user_id: viewerId, body: text });
    if (error) {
      setSaving(false);
      window.alert("Couldn’t post your comment. Try again.");
      return;
    }
    startRefresh(() => {
      setSaving(false);
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={post} className="flex flex-col gap-2">
      <label htmlFor="comment" className="sr-only">
        Add a comment
      </label>
      <textarea
        id="comment"
        className={`${fieldClass} resize-none py-3`}
        rows={2}
        placeholder="Add a comment…"
        value={body}
        maxLength={COMMENT_MAX}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          // ⌘/Ctrl+Enter posts; Enter alone is a new line.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post(e);
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-footnote text-label-secondary" aria-live="polite">
          {body.length > COMMENT_MAX - 50 ? `${body.length}/${COMMENT_MAX}` : ""}
        </span>
        <Button type="submit" size="sm" disabled={!text || busy}>
          {busy ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
