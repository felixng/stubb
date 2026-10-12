// Triggers one action; matches FLButtonStyle in SwiftUI. One `primary` per
// screen, `secondary` for alternatives, `ghost` for low emphasis. Capsule.
const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-sans font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40";

const sizes = {
  md: "min-h-[50px] px-6 text-headline",
  sm: "min-h-11 px-4 text-[15px] leading-5",
};

const variants = {
  primary: "bg-tint text-on-tint hover:bg-tint-pressed",
  secondary: "bg-tint-fill text-tint hover:bg-fill",
  ghost: "bg-transparent text-tint hover:bg-tint-fill",
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
