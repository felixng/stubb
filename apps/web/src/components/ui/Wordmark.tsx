// The Stubbed wordmark; matches FLWordmark: "stubbed" in lowercase, heavy,
// tight tracking, in `label`, never `tint`. Screen readers hear "Stubbed".
export function Wordmark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block font-display leading-none font-extrabold tracking-[-0.045em] text-label ${className}`}
      style={{ fontSize: Math.max(16, size) }}
    >
      <span aria-hidden="true">stubbed</span>
      <span className="sr-only">Stubbed</span>
    </span>
  );
}
