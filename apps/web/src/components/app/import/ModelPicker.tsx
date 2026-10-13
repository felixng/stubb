"use client";

import { useEffect, useId } from "react";

import { fieldClass } from "../log/Typeahead";

export type ProviderInfo = {
  id: string;
  name: string;
  defaultModel: string;
  images: boolean;
  configured: boolean;
  // What the provider serves to this key, when it can list them.
  models: string[];
  // Models compare mode runs as separate columns ([] = just the default).
  compareModels: string[];
};
export type ProvidersInfo = { providers: ProviderInfo[]; defaults: { email: string[]; identify: string[] } };

// Send each source to every provider with a key and compare (the default).
export const COMPARE_ALL = "all";
// The configured chain, with fallback (what the log form uses).
export const DEFAULT_CHAIN = "chain";

const STORAGE_KEY = "stubbed.import.model";

// Remembered per browser; storage can be unavailable (private mode).
function load() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Not remembered; it still applies to this session.
  }
}

const short = (ref: string) => ref.split(":")[0];

// Owner testing aid for the import tool: which AI reads emails and photos.
// COMPARE_ALL asks every configured provider and shows the answers side by
// side; DEFAULT_CHAIN runs the configured chain; "provider" or
// "provider:model" runs only that model.
export function ModelPicker({
  value,
  onChange,
  info,
}: {
  value: string;
  onChange: (value: string) => void;
  info: ProvidersInfo | null;
}) {
  const id = useId();
  const single = value !== COMPARE_ALL && value !== DEFAULT_CHAIN;
  const colon = value.indexOf(":");
  const provider = single ? (colon < 0 ? value : value.slice(0, colon)) : "";
  const model = single && colon >= 0 ? value.slice(colon + 1) : "";
  const picked = info?.providers.find((p) => p.id === provider);
  const configured = info?.providers.filter((p) => p.configured) ?? [];

  useEffect(() => {
    const saved = load();
    if (saved) onChange(saved);
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
          value={single ? provider : value}
          onChange={(e) => set(e.target.value)}
          className={`${fieldClass} min-w-0 flex-1 basis-48 cursor-pointer`}
        >
          <option value={COMPARE_ALL}>Compare all providers side by side</option>
          <option value={DEFAULT_CHAIN}>
            Default chain, with fallback (emails: {chain(info?.defaults.email)}; photos: {chain(info?.defaults.identify)})
          </option>
          {info?.providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.configured}>
              {p.name} only
              {p.configured ? "" : " (no API key)"}
              {p.images ? "" : " (text only)"}
            </option>
          ))}
        </select>
        {single && (
          <>
            <label htmlFor={`${id}-model`} className="sr-only">
              Model id
            </label>
            <input
              id={`${id}-model`}
              list={`${id}-models`}
              value={model}
              onChange={(e) => set(e.target.value.trim() ? `${provider}:${e.target.value.trim()}` : provider)}
              placeholder={picked?.defaultModel ?? "Model id"}
              spellCheck={false}
              className={`${fieldClass} min-w-0 flex-1 basis-56 font-mono text-footnote`}
            />
            {/* Suggestions from the provider's own model list. */}
            <datalist id={`${id}-models`}>
              {picked?.models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </>
        )}
      </div>
      <p className="text-footnote text-label-secondary">
        {value === COMPARE_ALL
          ? `Each email or photo visit goes to ${
              configured.length
                ? configured
                    .map((p) => (p.compareModels.length > 1 ? `${p.name} (${p.compareModels.length} models)` : p.name))
                    .join(", ")
                : "every provider with an API key"
            } at once (photos skip text-only models), so it costs one call per column. Fable is the priciest Claude model. Pick whose answer to use for each.`
          : value === DEFAULT_CHAIN
            ? "Tries each model in order and falls back when one fails or isn’t sure."
            : `Only ${picked?.name ?? provider} runs, with no fallback. Leave the model empty for its default${
                picked?.defaultModel ? ` (${picked.defaultModel})` : ""
              }.${
                picked && !picked.images ? " It can’t read photos." : ""
              }`}{" "}
        Applies to files added from now on.
      </p>
    </div>
  );
}
