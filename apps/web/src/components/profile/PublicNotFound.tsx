import Link from "next/link";

// The not-found card for public pages (profiles, entries, trips).
export function PublicNotFound({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-separator bg-surface px-6 py-12 text-center shadow-sm">
      <h1 className="text-headline text-label">{title}</h1>
      <p className="max-w-[320px] text-subheadline text-label-secondary">
        {body}{" "}
        <Link href="/" className="font-semibold text-tint-text underline-offset-2 hover:underline">
          What is Stubbed?
        </Link>
      </p>
    </div>
  );
}
