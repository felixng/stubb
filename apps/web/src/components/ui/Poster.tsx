function initials(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

// A 2:3 poster at radius-sm; with no image, the show's initials in `outline`
// on `fill`. Shared by ShowRow and ShowCard.
export function Poster({
  title,
  poster,
  className = "",
  initialsClassName = "text-title-2",
}: {
  title: string;
  poster?: string;
  className?: string;
  initialsClassName?: string;
}) {
  if (poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- posters come from anywhere
      <img
        src={poster}
        alt=""
        className={`aspect-2/3 rounded-sm bg-fill object-cover ${className}`}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`flex aspect-2/3 items-center justify-center rounded-sm bg-fill font-display font-bold text-outline ${initialsClassName} ${className}`}
    >
      {initials(title)}
    </div>
  );
}
