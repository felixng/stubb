import Link from "next/link";

import { signOut } from "@/app/login/actions";

// Small menu in the app header. <details> gives keyboard and screen-reader
// support with no client JavaScript.
export function AccountMenu() {
  return (
    <details className="relative">
      <summary
        aria-label="Menu"
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-pill text-label hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true" focusable="false" fill="currentColor">
          <circle cx="5" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="19" cy="12" r="1.75" />
        </svg>
      </summary>
      <div className="absolute right-0 z-10 mt-1 min-w-44 overflow-hidden rounded-md border border-separator bg-surface shadow-lg">
        <Link
          href="/app/import"
          className="flex min-h-11 w-full items-center px-4 text-body text-label hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          Import shows
        </Link>
        <form action={signOut} className="border-t border-separator">
          <button
            type="submit"
            className="block min-h-11 w-full px-4 text-left text-body text-destructive hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
