// The Stubbed wordmark; matches FLWordmark: capitals, heavy, open tracking,
// in `label`, never `tint` or `tint-text`. Capitals come from CSS.
export function Wordmark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block font-display leading-none font-extrabold tracking-[0.06em] text-label uppercase ${className}`}
      style={{ fontSize: size }}
    >
      Stubbed
    </span>
  );
}
