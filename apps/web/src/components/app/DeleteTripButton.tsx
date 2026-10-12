"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Deletes a trip or label. Its entries stay in the diary.
export function DeleteTripButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Delete this trip? The shows stay in your diary.")) return;
        setBusy(true);
        const { error } = await createClient().from("collections").delete().eq("id", id);
        if (error) {
          setBusy(false);
          window.alert("Couldn’t delete. Try again.");
          return;
        }
        router.push("/app/trips");
        router.refresh();
      }}
      className="min-h-11 self-center rounded-pill px-4 text-subheadline font-semibold text-destructive hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-40"
    >
      {busy ? "Deleting…" : "Delete trip"}
    </button>
  );
}
