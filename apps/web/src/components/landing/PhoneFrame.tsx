import Image from "next/image";

import frame from "@/images/phone-frame.svg";

// Adapted from the Tailwind Plus "Pocket" template: a 366×729 phone frame
// with the screen area positioned in percentages so it scales with width.
export function PhoneFrame({
  className = "",
  children,
  priority = false,
  alt = "",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { priority?: boolean; alt?: string }) {
  return (
    <div className={`relative aspect-366/729 ${className}`} {...props}>
      <div className="absolute inset-y-[calc(1/729*100%)] right-[calc(5/729*100%)] left-[calc(7/729*100%)] rounded-[calc(58/366*100%)/calc(58/729*100%)] shadow-lg" />
      <div className="absolute top-[calc(23/729*100%)] left-[calc(23/366*100%)] grid h-[calc(686/729*100%)] w-[calc(318/366*100%)] grid-cols-1 overflow-hidden rounded-[calc(34/318*100%)/calc(34/686*100%)] bg-background">
        {children}
      </div>
      <Image
        src={frame}
        alt={alt}
        className="pointer-events-none absolute inset-0 h-full w-full"
        unoptimized
        priority={priority}
      />
    </div>
  );
}
