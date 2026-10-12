// A compact label or filter. With `onClick` it is a toggle button
// (aria-pressed); without, a static tag. No ratings or numbers in chips.
export function Chip({
  selected = false,
  onClick,
  className = "",
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = `inline-flex items-center rounded-sm border border-transparent px-3 py-1 font-sans text-label ${
    selected ? "bg-ink text-surface" : "bg-accent-tint text-ink"
  } ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={`${classes} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
      >
        {children}
      </button>
    );
  }
  return <span className={classes}>{children}</span>;
}
