"use client";

import { useEffect, useState } from "react";

import { Chip } from "@/components/ui/Chip";
import { SHOW_TYPE_LABELS, type NewShow, type Show, type ShowType } from "@/lib/entries";
import { createClient } from "@/lib/supabase/client";
import { SelectedValue } from "./SelectedValue";
import { Typeahead, type TypeaheadOption } from "./Typeahead";

// Pick a show: type-ahead over search_shows, or "Add '<title>'" to create it
// on save (type defaults to musical, editable).
export function ShowField({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy: string;
  value: Show | NewShow | null;
  onChange: (show: Show | NewShow | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Show[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await createClient().rpc("search_shows", { q });
      if (!cancelled) setResults(((data as Show[] | null) ?? []).slice(0, 8));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (value) {
    return (
      <div className="flex flex-col gap-3">
        <SelectedValue
          primary={value.title}
          secondary={value.id ? SHOW_TYPE_LABELS[value.type] : "New show"}
          onChange={() => {
            setQuery(value.title);
            onChange(null);
          }}
        />
        {!value.id && (
          <div role="group" aria-label="Show type" className="flex flex-wrap gap-2">
            {(Object.keys(SHOW_TYPE_LABELS) as ShowType[]).map((t) => (
              <Chip key={t} selected={value.type === t} onClick={() => onChange({ ...value, type: t })}>
                {SHOW_TYPE_LABELS[t]}
              </Chip>
            ))}
          </div>
        )}
      </div>
    );
  }

  const q = query.trim();
  const matches = q.length >= 2 ? results : [];
  const exact = matches.some((s) => s.title.toLowerCase() === q.toLowerCase());
  const options: TypeaheadOption[] = matches.map((s) => ({
    key: s.id,
    primary: s.title,
    secondary: SHOW_TYPE_LABELS[s.type],
    onSelect: () => onChange(s),
  }));
  if (q && !exact) {
    options.push({
      key: "add",
      primary: `Add “${q}”`,
      secondary: "New show",
      emphasis: true,
      onSelect: () => onChange({ title: q, type: "musical" }),
    });
  }

  return (
    <Typeahead
      labelledBy={labelledBy}
      query={query}
      onQueryChange={setQuery}
      options={options}
      placeholder="Search shows"
    />
  );
}
