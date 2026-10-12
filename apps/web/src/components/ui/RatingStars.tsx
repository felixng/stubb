// Five stars in half steps, read-only; matches FLRatingStars. Filled stars
// use `star`, empty ones `outline`. Never a bare number.
const STAR =
  "M12 2.8l2.8 5.9 6.5.8-4.8 4.5 1.2 6.4L12 17.2l-5.7 3.2 1.2-6.4-4.8-4.5 6.5-.8z";

function Star({ size, filled }: { size: number; filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="block"
    >
      <path
        d={STAR}
        strokeWidth={1.5}
        strokeLinejoin="round"
        className={
          filled
            ? "fill-star stroke-star"
            : "fill-none stroke-outline"
        }
      />
    </svg>
  );
}

export function RatingStars({
  value,
  size = 16,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const rating = Math.max(0, Math.min(5, value || 0));
  return (
    <span
      role="img"
      aria-label={`Rated ${rating} out of 5`}
      className={`inline-flex gap-0.5 align-middle ${className}`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span
            key={i}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            <span className="absolute inset-0">
              <Star size={size} filled={false} />
            </span>
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={size} filled />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
