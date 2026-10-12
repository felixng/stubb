// The product name, typeset (no logo file exists): lowercase display face at
// its heaviest weight, in `ink` only. Minimum 20px.
export function Wordmark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block font-display leading-none font-bold tracking-[-0.02em] text-ink lowercase ${className}`}
      style={{ fontSize: Math.max(20, size) }}
    >
      Stubbed
    </span>
  );
}
