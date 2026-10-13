import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { Wordmark } from "@/components/ui/Wordmark";
import { LoginForm } from "./LoginForm";

// Owner sign-in (#13). Linked only from the landing page menu and kept out
// of search engines. Security comes from Supabase Auth (sign-ups are off), not from the
// page being hidden.
export const metadata: Metadata = {
  title: "Sign in — Stubbed",
  robots: { index: false, follow: false },
};

// Always light, like the landing page and the app (owner's call).
export const viewport: Viewport = { themeColor: "#fff9f6" };

export default function LoginPage() {
  return (
    <main data-theme="light" className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-[380px] flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark size={44} />
          <h1 className="text-title-2 font-display text-label">Sign in</h1>
        </div>
        {/* Reads ?next and ?error, so it renders at request time. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
