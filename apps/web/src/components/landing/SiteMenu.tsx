import Link from "next/link";

// Hamburger menu at the top right of the landing page. For now it only links
// to sign-in. <details> gives keyboard and screen-reader support with no
// client JavaScript.
export function SiteMenu() {
  return (
    <details className="relative">
      <summary
        aria-label="Menu"
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-pill text-label hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          width={24}
          height={24}
          aria-hidden="true"
          focusable="false"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </summary>
      <nav
        aria-label="Site"
        className="absolute right-0 z-10 mt-1 min-w-44 overflow-hidden rounded-md border border-separator bg-surface shadow-lg"
      >
        <Link
          href="/login"
          className="flex min-h-11 items-center px-4 text-body text-label hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          Sign in
        </Link>
      </nav>
    </details>
  );
}
