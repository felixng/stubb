"use client";

import { useActionState, useId } from "react";

import { joinWaitlist, type WaitlistState } from "@/app/waitlist-action";
import { Button } from "@/components/ui/Button";

// Where a visitor came from (e.g. ?utm_source=instagram), so we can see
// whether shared cards drive sign-ups.
function sourceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("utm_source") ?? params.get("ref") ?? document.referrer;
}

export function WaitlistForm() {
  const id = useId();
  const [state, dispatch, pending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    { status: "idle" },
  );

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="max-w-md rounded-lg border border-border bg-surface-raised p-4 text-title text-ink"
      >
        You’re on the list.
        <span className="mt-1 block text-body font-normal text-ink-muted">
          We’ll email you when the curtain goes up.
        </span>
      </p>
    );
  }

  return (
    <form
      action={(formData) => {
        formData.set("source", sourceFromUrl());
        dispatch(formData);
      }}
      className="w-full max-w-md"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-describedby={state.status === "error" ? `${id}-error` : undefined}
          className="block min-h-11 w-full min-w-0 flex-auto rounded-sm border border-border-strong bg-surface-raised px-3 text-body text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        {/* Honeypot: hidden from people and screen readers. */}
        <div aria-hidden="true" className="absolute -left-[9999px]">
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <Button type="submit" disabled={pending} className="flex-none">
          {pending ? "Saving your seat…" : "Get your ticket!"}
        </Button>
      </div>
      <p
        id={`${id}-error`}
        aria-live="polite"
        className="mt-2 min-h-5 text-caption text-ink"
      >
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
