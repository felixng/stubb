// Triggers one action. One `primary` per screen; `secondary` for
// alternatives; `ghost` for low-emphasis actions. Labels are short verbs.
const base =
  "inline-flex items-center justify-center gap-2 rounded-md border border-transparent font-sans font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45";

const sizes = {
  md: "min-h-11 px-6 text-[15px] leading-5",
  sm: "min-h-9 px-4 text-label",
};

const variants = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong",
  secondary:
    "border-border-strong bg-surface-raised text-ink hover:bg-surface-sunken",
  ghost: "bg-transparent text-accent hover:bg-accent-tint hover:text-ink",
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
