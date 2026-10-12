// A capsule for a category, tag or filter; matches FLChip. With `onClick` it
// is a toggle button (aria-pressed). Selected chips invert; never `tint`.
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
  const classes = `inline-flex min-h-7 items-center rounded-pill px-3 font-sans text-footnote font-medium ${
    selected ? "bg-label text-background" : "bg-fill text-label"
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
