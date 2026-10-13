"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { HANDLE_PATTERN } from "@/lib/profile-handle";
import { createClient } from "@/lib/supabase/client";
import { fieldClass } from "./log/Typeahead";

const label = "text-subheadline font-medium text-label";

// Handle and display name. Setting a handle is what turns the public profile
// (/@handle) on; clearing it turns it off. RLS limits the write to the
// signed-in user's own row.
export function ProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial: { handle: string | null; display_name: string | null };
}) {
  const id = useId();
  const router = useRouter();
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [saved, setSaved] = useState(initial.handle);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const h = handle.trim().replace(/^@/, "").toLowerCase();
    if (h && !HANDLE_PATTERN.test(h)) {
      return setStatus({ ok: false, text: "Use 3–20 lowercase letters, numbers or underscores." });
    }
    setSaving(true);
    const { error } = await createClient()
      .from("profiles")
      .update({ handle: h || null, display_name: displayName.trim() || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      return setStatus({
        ok: false,
        text: error.code === "23505" ? `@${h} is taken. Try another.` : "Couldn’t save. Try again.",
      });
    }
    setHandle(h);
    setSaved(h || null);
    setStatus({ ok: true, text: h ? "Saved. Your profile is live." : "Saved. Your public profile is off." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-handle`} className={label}>
          Handle
        </label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body text-label-secondary">
            @
          </span>
          <input
            id={`${id}-handle`}
            className={`${fieldClass} pl-9`}
            value={handle}
            maxLength={21}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="sillyelphaba"
            aria-describedby={`${id}-handle-hint`}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
          />
        </div>
        <p id={`${id}-handle-hint`} className="text-footnote text-label-secondary">
          Your public profile is at /@{handle.replace(/^@/, "") || "handle"} and shows public entries only. Leave
          empty to turn it off.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className={label}>
          Display name <span className="font-normal text-label-secondary">(optional)</span>
        </label>
        <input
          id={`${id}-name`}
          className={fieldClass}
          value={displayName}
          maxLength={50}
          autoComplete="name"
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      {status && (
        <p role={status.ok ? "status" : "alert"} className={`text-footnote ${status.ok ? "text-label" : "text-destructive"}`}>
          {status.text}
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
      {saved && (
        <Link
          href={`/@${saved}`}
          className="inline-flex min-h-[50px] items-center justify-center rounded-pill bg-tint-fill px-6 text-headline text-tint-text hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          View public profile
        </Link>
      )}
    </form>
  );
}
