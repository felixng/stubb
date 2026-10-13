"use client";

import { useEffect, useId, useState } from "react";

import { fieldClass } from "../log/Typeahead";

type ProviderInfo = { id: string; name: string; defaultModel: string; images: boolean; configured: boolean };
type Info = { providers: ProviderInfo[]; defaults: { email: string[]; identify: string[] } };

const STORAGE_KEY = "stubbed.import.model";

// Remembered per browser; storage can be unavailable (private mode).
function load() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function store(value: string) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not remembered; it still applies to this session.
  }
}

const short = (ref: string) => ref.split(":")[0];

// Owner testing aid for the import tool: which AI reads emails and photos.
// "" is the configured chain (with fallbacks); "provider" or
// "provider:model" runs only that model, so results can be compared.
export function ModelPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const [info, setInfo] = useState<Info | null>(null);
  const colon = value.indexOf(":");
  const provider = colon < 0 ? value : value.slice(0, colon);
  const model = colon < 0 ? "" : value.slice(colon + 1);
  const picked = info?.providers.find((p) => p.id === provider);

  useEffect(() => {
    const saved = load();
    if (saved) onChange(saved);
    fetch("/api/ai/providers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Info | null) => setInfo(data))
      .catch(() => setInfo(null));
    // Once, on mount: restore the saved choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (next: string) => {
    store(next);
    onChange(next);
  };

  const chain = (refs: string[] | undefined) => (refs?.length ? refs.map(short).join(" → ") : "none configured");

  return (
    <div className="flex flex-col gap-2 rounded-md border border-separator bg-surface p-4 shadow-sm">
      <label htmlFor={`${id}-provider`} className="text-subheadline font-medium text-label">
        AI model
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          id={`${id}-provider`}
          value={provider}
          onChange={(e) => set(e.target.value)}
          className={`${fieldClass} min-w-0 flex-1 basis-48 cursor-pointer`}
        >
          <option value="">Default, with fallback (emails: {chain(info?.defaults.email)}; photos: {chain(info?.defaults.identify)})</option>
          {info?.providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.configured}>
              {p.name}
              {p.configured ? "" : " (no API key)"}
              {p.images ? "" : " (text only)"}
            </option>
          ))}
        </select>
        {provider && (
          <>
            <label htmlFor={`${id}-model`} className="sr-only">
              Model id
            </label>
            <input
              id={`${id}-model`}
              value={model}
              onChange={(e) => set(e.target.value.trim() ? `${provider}:${e.target.value.trim()}` : provider)}
              placeholder={picked?.defaultModel ?? "Model id"}
              spellCheck={false}
              className={`${fieldClass} min-w-0 flex-1 basis-56 font-mono text-footnote`}
            />
          </>
        )}
      </div>
      <p className="text-footnote text-label-secondary">
        {provider
          ? `Only ${picked?.name ?? provider} runs, with no fallback, so you can compare. Leave the model empty for its default.${
              picked && !picked.images ? " It can’t read photos." : ""
            }`
          : "Tries each model in order and falls back when one fails or isn’t sure."}{" "}
        Applies to files added from now on.
      </p>
    </div>
  );
}
