"use client";

import { formatDate } from "@/lib/entries";

// A date field that looks the same everywhere. iOS Safari draws its own date
// control and ignores most styling, so we show our own field and lay the real
// <input type="date"> invisibly on top: a tap still opens the native picker,
// and screen readers and keyboards still get the native input.
export function DateField({
  id,
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  compact = false,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  // No weekday, for narrow columns.
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative flex min-h-[50px] items-center gap-3 rounded-md border border-separator bg-surface px-4 shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${className}`}
    >
      <span className={`flex-1 truncate text-body ${value ? "text-label" : "text-label-secondary"}`}>
        {value
          ? formatDate(value, { ...(compact ? {} : { weekday: "short" }), day: "numeric", month: "short", year: "numeric" })
          : placeholder}
      </span>
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-label-secondary"
      >
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </svg>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        // Desktop browsers only open the picker from their own icon; open it
        // on any click. iOS opens it on tap regardless.
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            // Not allowed here (e.g. already open); the native behaviour applies.
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
    </div>
  );
}
