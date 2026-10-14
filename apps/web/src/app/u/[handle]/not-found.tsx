import Link from "next/link";

// An unknown handle, or a profile that hasn't turned its public page on.
export default function ProfileNotFound() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-separator bg-surface px-6 py-12 text-center shadow-sm">
      <h1 className="text-headline text-label">No one here</h1>
      <p className="max-w-[320px] text-subheadline text-label-secondary">
        This handle doesn’t have a public profile.{" "}
        <Link href="/" className="font-semibold text-tint-text underline-offset-2 hover:underline">
          What is Stubbed?
        </Link>
      </p>
    </div>
  );
}
