"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useId } from "react";

import { Button } from "@/components/ui/Button";
import { signInWithGoogle, signInWithPassword, type LoginState } from "./actions";

const field =
  "block min-h-[50px] w-full rounded-md border border-separator bg-surface px-4 text-body text-label shadow-sm placeholder:text-label-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const label = "text-subheadline font-medium text-label";

// Google, or email + password. The page the visitor was sent here from
// (?next=/app/...) rides along so they land back on it.
export function LoginForm() {
  const id = useId();
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [state, dispatch, pending] = useActionState<LoginState, FormData>(
    signInWithPassword,
    {},
  );

  const error =
    state.error ??
    (params.get("error") === "google"
      ? "Couldn’t sign in with Google. Use the Google account that matches your Stubbed email."
      : undefined);

  return (
    <div className="flex flex-col gap-6">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="neutral" className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>
      </form>

      <div className="flex items-center gap-3 text-footnote text-label-secondary">
        <span className="h-px flex-1 bg-separator" />
        or
        <span className="h-px flex-1 bg-separator" />
      </div>

      <form action={dispatch} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-email`} className={label}>
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            placeholder="you@example.com"
            className={field}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-password`} className={label}>
            Password
          </label>
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={error ? `${id}-error` : undefined}
            className={field}
          />
        </div>
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-footnote text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

// Google's "G", in its brand colours as Google's sign-in guidelines require.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
