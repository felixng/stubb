"use client";

import { useActionState, useEffect, useId, useState } from "react";

import { fieldClass } from "@/components/app/log/Typeahead";
import { Button } from "@/components/ui/Button";
import { BIO_MAX, NAME_MAX, handleProblem, normalizeHandle } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { completeProfile, type ProfileFields, type WelcomeState } from "./actions";

const label = "text-subheadline font-medium text-label";
const optional = <span className="font-normal text-label-secondary">(optional)</span>;

type Availability = "checking" | "available" | "taken" | null;

// Name, handle, bio and one link. The handle is checked as it's typed; the
// save still catches a handle taken in the meantime.
export function WelcomeForm({ next, initial }: { next: string; initial: ProfileFields }) {
  const id = useId();
  const [state, dispatch, pending] = useActionState<WelcomeState, FormData>(completeProfile, {});
  const values = state.values ?? initial;
  const errors = state.errors ?? {};

  const [handle, setHandle] = useState(values.handle);
  const [bio, setBio] = useState(values.bio);
  // The last lookup, keyed by the handle it was for, so a stale answer never
  // shows against what's typed now.
  const [checked, setChecked] = useState<{ handle: string; taken: boolean | null } | null>(null);
  const formatProblem = handle ? handleProblem(handle) : null;
  const availability: Availability =
    !handle || formatProblem
      ? null
      : checked?.handle === handle
        ? checked.taken === null
          ? null
          : checked.taken
            ? "taken"
            : "available"
        : "checking";

  useEffect(() => {
    if (!handle || handleProblem(handle)) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const { data, error } = await createClient()
        .from("profiles")
        .select("id")
        .eq("handle", handle)
        .maybeSingle();
      // On a failed lookup, say nothing: the save still checks.
      if (!stale) setChecked({ handle, taken: error ? null : Boolean(data) });
    }, 350);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [handle]);

  const handleMessage =
    formatProblem ??
    (availability === "taken"
      ? "That handle is taken."
      : (errors.handle ?? (availability === "available" ? `@${handle} is yours.` : null)));
  const handleIsError = Boolean(formatProblem || availability === "taken" || (errors.handle && availability !== "available"));

  return (
    <form action={dispatch} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />

      <Field id={`${id}-name`} label="Name" error={errors.name}>
        <input
          id={`${id}-name`}
          name="name"
          autoComplete="name"
          required
          maxLength={NAME_MAX}
          defaultValue={values.name}
          placeholder="Your name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${id}-name-msg` : undefined}
          className={fieldClass}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-handle`} className={label}>
          Handle
        </label>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body text-label-secondary"
          >
            @
          </span>
          <input
            id={`${id}-handle`}
            name="handle"
            required
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            maxLength={20}
            value={handle}
            onChange={(e) => setHandle(normalizeHandle(e.target.value))}
            placeholder="yourname"
            aria-invalid={handleIsError}
            aria-describedby={`${id}-handle-msg`}
            className={`${fieldClass} pl-9`}
          />
        </div>
        <p
          id={`${id}-handle-msg`}
          aria-live="polite"
          className={`text-footnote ${handleIsError ? "text-destructive" : "text-label-secondary"}`}
        >
          {handleMessage ?? (availability === "checking" ? "Checking…" : "3–20 letters, numbers or underscores.")}
        </p>
      </div>

      <Field
        id={`${id}-bio`}
        label="Bio"
        hint={optional}
        error={errors.bio}
        counter={`${bio.length}/${BIO_MAX}`}
      >
        <textarea
          id={`${id}-bio`}
          name="bio"
          rows={3}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Musicals, mostly. Always the front row."
          aria-invalid={Boolean(errors.bio)}
          aria-describedby={errors.bio ? `${id}-bio-msg` : undefined}
          className={`${fieldClass} resize-none py-3`}
        />
      </Field>

      <Field id={`${id}-link`} label="Link" hint={optional} error={errors.link}>
        <input
          id={`${id}-link`}
          name="link"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={values.link}
          placeholder="instagram.com/yourname"
          aria-invalid={Boolean(errors.link)}
          aria-describedby={errors.link ? `${id}-link-msg` : undefined}
          className={fieldClass}
        />
      </Field>

      {errors.form && (
        <p role="alert" className="text-footnote text-destructive">
          {errors.form}
        </p>
      )}
      <Button type="submit" disabled={pending || Boolean(formatProblem) || availability === "taken"}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label: text,
  hint,
  error,
  counter,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={label}>
          {text} {hint}
        </label>
        {counter && <span className="text-footnote text-label-secondary">{counter}</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-msg`} role="alert" className="text-footnote text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
