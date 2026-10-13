"use client";

import { useId, useState } from "react";

export type TypeaheadOption = {
  key: string;
  primary: string;
  secondary?: string | null;
  // Options like "Add 'Hadestown'" read differently from matches.
  emphasis?: boolean;
  onSelect: () => void;
};

export const fieldClass =
  "block min-h-[50px] w-full rounded-md border border-separator bg-surface px-4 text-body text-label shadow-sm placeholder:text-label-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// A text field with a list of suggestions (ARIA combobox). The parent owns
// the query and the options; this handles opening, arrow keys and Enter.
export function Typeahead({
  labelledBy,
  query,
  onQueryChange,
  options,
  placeholder,
  heading,
  autoFocus,
}: {
  labelledBy: string;
  query: string;
  onQueryChange: (q: string) => void;
  options: TypeaheadOption[];
  placeholder?: string;
  heading?: string | null;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const showList = open && options.length > 0;
  const current = Math.min(active, options.length - 1);

  const pick = (o: TypeaheadOption) => {
    setOpen(false);
    o.onSelect();
  };

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-labelledby={labelledBy}
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${id}-${current}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        autoFocus={autoFocus}
        className={fieldClass}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Let a tap on an option land before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && showList) {
            e.preventDefault();
            pick(options[current]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={labelledBy}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-separator bg-surface py-1 shadow-lg"
        >
          {heading && (
            <li role="presentation" className="px-4 pt-2 pb-1 text-caption font-medium text-label-secondary uppercase">
              {heading}
            </li>
          )}
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === current}
              className={`flex min-h-11 cursor-pointer flex-col justify-center px-4 py-2 ${
                i === current ? "bg-fill" : ""
              }`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              onMouseEnter={() => setActive(i)}
            >
              <span className={`text-body ${o.emphasis ? "font-semibold text-tint-text" : "text-label"}`}>
                {o.primary}
              </span>
              {o.secondary && <span className="text-footnote text-label-secondary">{o.secondary}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
