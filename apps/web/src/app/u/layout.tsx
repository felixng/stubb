import Link from "next/link";

import { Wordmark } from "@/components/ui/Wordmark";

// Shell for public profiles (/@handle), shared with their not-found page.
export default function PublicProfileLayout({ children }: LayoutProps<"/u">) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-separator bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1040px] items-center justify-between px-4 sm:px-8">
          <Link href="/" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            <Wordmark size={26} />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-pill px-3 text-subheadline font-semibold text-tint-text hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Get Stubbed
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-5 px-4 py-5 sm:px-8">{children}</main>
    </div>
  );
}
