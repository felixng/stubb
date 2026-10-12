import type { Metadata } from "next";

import { Wordmark } from "@/components/ui/Wordmark";
import { LoginForm } from "./LoginForm";

// Owner sign-in (#13). Not linked from anywhere and kept out of search
// engines. Security comes from Supabase Auth (sign-ups are off), not from the
// page being hidden.
export const metadata: Metadata = {
  title: "Sign in — Stubbed",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-[380px] flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark size={24} />
          <h1 className="text-title-2 font-display text-label">Sign in</h1>
          <p className="text-subheadline text-label-secondary">
            We’ll email you a 6-digit code.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
