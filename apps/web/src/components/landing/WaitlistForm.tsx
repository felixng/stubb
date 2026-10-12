"use client";

import { useActionState, useId } from "react";

import { joinWaitlist, type WaitlistState } from "@/app/waitlist-action";

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
        className="rounded-2xl border border-line bg-paper px-5 py-4 text-base font-semibold text-ink"
      >
        You’re on the list 🎟️
        <span className="mt-1 block text-sm font-normal text-ink-muted">
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
          className="block w-full min-w-0 flex-auto rounded-lg border border-line bg-white px-3.5 py-2.5 text-base text-[#1c1517] placeholder:text-[#6b5f5f]/70 focus:border-curtain focus:ring-2 focus:ring-curtain/30 focus:outline-none"
        />
        {/* Honeypot: hidden from people and screen readers. */}
        <div aria-hidden="true" className="absolute -left-[9999px]">
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex flex-none items-center justify-center rounded-lg bg-curtain px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-curtain-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-curtain disabled:opacity-70"
        >
          {pending ? "Saving your seat…" : "Join the waitlist"}
        </button>
      </div>
      <p
        id={`${id}-error`}
        aria-live="polite"
        className="mt-2 min-h-5 text-sm text-curtain"
      >
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
