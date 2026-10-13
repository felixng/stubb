import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileForm } from "@/components/app/ProfileForm";
import { getOwnProfile, ownerContext } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Profile" };

async function Form() {
  const [{ userId }, profile] = await Promise.all([ownerContext(), getOwnProfile()]);
  if (!userId) return null;
  return <ProfileForm userId={userId} initial={profile ?? { handle: null, display_name: null }} />;
}

// Handle and display name for the public profile (/@handle).
export default function ProfilePage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-large-title font-display text-label">Profile</h1>
      <Suspense fallback={<p className="text-subheadline text-label-secondary">Loading…</p>}>
        <Form />
      </Suspense>
    </section>
  );
}
