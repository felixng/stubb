import Link from "next/link";

// The Stubbed wordmark; matches FLWordmark: "stubbed" in lowercase, heavy,
// tight tracking, in `label`, never `tint` or `tint-text`. Screen readers
// hear "Stubbed". With `href` it becomes a home link.
export function Wordmark({
  size = 28,
  className = "",
  href,
}: {
  size?: number;
  className?: string;
  href?: string;
}) {
  const mark = (
    <span
      className={`inline-block font-display leading-none font-extrabold tracking-[-0.045em] text-label ${className}`}
      style={{ fontSize: Math.max(16, size) }}
    >
      <span aria-hidden="true">stubbed</span>
      <span className="sr-only">Stubbed</span>
    </span>
  );
  if (!href) return mark;
  return (
    <Link
      href={href}
      className="-mx-1 inline-flex min-h-11 items-center rounded-md px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {mark}
    </Link>
  );
}
