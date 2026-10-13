// Placeholder body for app screens with nothing in them yet.
export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-separator bg-surface px-6 py-12 text-center shadow-sm">
      <h2 className="text-headline text-label">{title}</h2>
      <p className="max-w-[320px] text-subheadline text-label-secondary">{children}</p>
    </div>
  );
}
