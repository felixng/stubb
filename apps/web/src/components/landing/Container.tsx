// Adapted from the Tailwind Plus "Pocket" template.
export function Container({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
      {...props}
    />
  );
}
