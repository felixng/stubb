import Link from "next/link";
import { cache, Suspense } from "react";

import { Wordmark } from "@/components/ui/Wordmark";
import { viewerContext } from "@/lib/follows";

// Shell for the public pages: profiles (/@handle), entries (/e/[id]) and
// trips (/t/[id]), and their not-found pages.
// Always light, like the landing page (data-theme switches the whole
// document). Visitors here are mostly logged out and arrive from a shared
// card or an Instagram bio, so the header button and the join card both lead
// to the waitlist; sign-ups are still off.
const JOIN_HREF = "/#waitlist";
const JOIN_BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-pill bg-tint font-sans font-semibold text-on-tint shadow-btn transition-colors hover:bg-tint-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-separator bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1040px] items-center justify-between px-4 sm:px-8">
          <Link href="/" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            <Wordmark size={26} />
          </Link>
          <Link href={JOIN_HREF} className={`${JOIN_BUTTON} px-4 text-[15px] leading-5`}>
            Join the waitlist
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-5 px-4 py-5 sm:px-8">
        <Suspense fallback={<JoinCard top />}>
          <JoinCardFor signedIn={false} top />
        </Suspense>
        {children}
        <Suspense fallback={null}>
          <JoinCardFor signedIn />
        </Suspense>
      </main>
    </div>
  );
}

// Signed-out visitors (most of them) see the card first, above the page;
// signed-in ones see it under the page. The fallback is the top card, so
// signed-out visitors get no layout shift while the session is checked.
async function JoinCardFor({ signedIn, top = false }: { signedIn: boolean; top?: boolean }) {
  return (await isSignedIn()) === signedIn ? <JoinCard top={top} /> : null;
}

const isSignedIn = cache(async () => (await viewerContext()).userId !== null);

function JoinCard({ top = false }: { top?: boolean }) {
  return (
    <section
      aria-labelledby="join-heading"
      className={`${top ? "" : "mt-4 "}flex flex-col items-start gap-4 rounded-md border border-separator bg-tint-fill p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="join-heading" className="font-display text-title-2 text-label">
          Keep your own theatre diary
        </h2>
        <p className="max-w-[460px] text-subheadline text-label-secondary">
          Track the shows you see, rate them and share a card. Stubbed is in private beta, and the waitlist is open.
        </p>
      </div>
      <Link href={JOIN_HREF} className={`${JOIN_BUTTON} min-h-[50px] shrink-0 px-6 text-headline`}>
        Join the waitlist
      </Link>
    </section>
  );
}
