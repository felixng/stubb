// A picked show or venue, with a way to change it.
export function SelectedValue({
  primary,
  secondary,
  onChange,
}: {
  primary: string;
  secondary?: string | null;
  onChange: () => void;
}) {
  return (
    <div className="flex min-h-[50px] items-center gap-3 rounded-md border border-separator bg-surface py-2 pr-2 pl-4 shadow-sm">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-semibold text-label">{primary}</span>
        {secondary && <span className="truncate text-footnote text-label-secondary">{secondary}</span>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className="min-h-11 shrink-0 rounded-pill px-4 text-subheadline font-semibold text-tint-text hover:bg-tint-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Change
      </button>
    </div>
  );
}
