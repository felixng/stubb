"use client";

import { useActionState, useId } from "react";

import { Button } from "@/components/ui/Button";
import { login, type LoginState } from "./actions";

const field =
  "block min-h-[50px] w-full rounded-md border border-separator bg-surface px-4 text-body text-label shadow-sm placeholder:text-label-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Email → 6-digit code → signed in. The page the visitor was sent here from
// (?next=/app/...) rides along so they land back on it.
export function LoginForm() {
  const id = useId();
  const [state, dispatch, pending] = useActionState<LoginState, FormData>(
    login,
    { step: "email" },
  );

  const submit = (formData: FormData) => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) formData.set("next", next);
    dispatch(formData);
  };

  const error = state.error ? (
    <p id={`${id}-error`} role="alert" className="text-footnote text-destructive">
      {state.error}
    </p>
  ) : null;

  if (state.step === "email") {
    return (
      <form key={state.step} action={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-email`} className="text-subheadline font-medium text-label">
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            defaultValue={state.email}
            placeholder="you@example.com"
            aria-describedby={state.error ? `${id}-error` : undefined}
            className={field}
          />
          {error}
        </div>
        <Button type="submit" name="intent" value="send" disabled={pending}>
          {pending ? "Sending…" : "Send code"}
        </Button>
      </form>
    );
  }

  return (
    <form key={state.step} action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={state.email} />
      <p role="status" className="text-subheadline text-label-secondary">
        If <span className="font-medium text-label">{state.email}</span> has an
        account, a 6-digit code is on its way. Check your inbox.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-code`} className="text-subheadline font-medium text-label">
          Code
        </label>
        <input
          id={`${id}-code`}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          required
          autoFocus
          placeholder="123456"
          aria-describedby={state.error ? `${id}-error` : undefined}
          className={`${field} text-center text-title-2 tracking-[0.3em] tabular-nums`}
        />
        {error}
      </div>
      <Button type="submit" name="intent" value="verify" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </Button>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          name="intent"
          value="send"
          formNoValidate
          disabled={pending}
        >
          Send a new code
        </Button>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          name="intent"
          value="restart"
          formNoValidate
          disabled={pending}
        >
          Use a different email
        </Button>
      </div>
    </form>
  );
}
