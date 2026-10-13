"use client";

import { useRef } from "react";

import { RatingStars } from "@/components/ui/RatingStars";

const SIZE = 36;

function label(value: number | null) {
  return value == null ? "No rating" : `${value} ${value === 1 ? "star" : "stars"}`;
}

// Half-star rating (0.5–5): tap or drag across the stars, tap the same value
// again to clear. A slider for assistive tech: arrows step by half a star,
// Home/End jump, Delete/Backspace clears.
export function RatingInput({
  value,
  onChange,
  labelledBy,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  labelledBy: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ start: number | null; moved: boolean } | null>(null);

  const fromPointer = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return null;
    const x = Math.max(0, Math.min(box.width, clientX - box.left));
    return Math.max(0.5, Math.ceil((x / box.width) * 10) / 2);
  };

  const step = (next: number | null) => onChange(next == null ? null : Math.max(0.5, Math.min(5, next)));

  return (
    <div className="flex items-center gap-3">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-labelledby={labelledBy}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value ?? 0}
        aria-valuetext={label(value)}
        className="inline-flex min-h-11 cursor-pointer touch-none items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { start: value, moved: false };
          const v = fromPointer(e.clientX);
          if (v != null && v !== value) onChange(v);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const v = fromPointer(e.clientX);
          if (v != null && v !== value) {
            drag.current.moved = true;
            onChange(v);
          }
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          // A tap (no drag) on the value already set clears it.
          if (d && !d.moved && d.start != null && fromPointer(e.clientX) === d.start) onChange(null);
        }}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const keys: Record<string, () => void> = {
            ArrowRight: () => step((value ?? 0) + 0.5),
            ArrowUp: () => step((value ?? 0) + 0.5),
            ArrowLeft: () => step(value == null || value <= 0.5 ? null : value - 0.5),
            ArrowDown: () => step(value == null || value <= 0.5 ? null : value - 0.5),
            Home: () => step(0.5),
            End: () => step(5),
            Delete: () => onChange(null),
            Backspace: () => onChange(null),
          };
          if (keys[e.key]) {
            e.preventDefault();
            keys[e.key]();
          }
        }}
      >
        <span aria-hidden="true" className="pointer-events-none">
          <RatingStars value={value ?? 0} size={SIZE} className="!gap-1" />
        </span>
      </div>
      {/* Stars only, never a bare number (docs/DESIGN.md). */}
      <span aria-hidden="true" className="text-footnote text-label-secondary">
        {value == null ? "Tap or drag" : "Tap again to clear"}
      </span>
    </div>
  );
}
