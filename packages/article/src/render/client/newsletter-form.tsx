'use client';

import { Loader2, Mail } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';

/**
 * The newsletter sign-up. Posts `{ email }` as JSON to the host's `action`;
 * without one (the editor, or a host that has no list) it shows the form and
 * sends nothing.
 */
export function NewsletterForm({
  action,
  placeholder,
  button,
  done,
  failed,
}: {
  action?: string | undefined;
  placeholder: string;
  button: string;
  done: string;
  failed: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;
    const email = new FormData(event.currentTarget).get('email');
    setState('sending');
    try {
      const response = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setState(response.ok ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
  };

  if (state === 'done') {
    return (
      <p
        role="status"
        className="text-foreground animate-[ui-rise_220ms_ease-out] text-sm font-medium"
      >
        {done}
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
    >
      <label className="relative flex-1">
        <span className="sr-only">{placeholder}</span>
        <Mail
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="email"
          name="email"
          required
          placeholder={placeholder}
          className="border-border bg-background focus:border-border-strong h-11 w-full rounded-[var(--radius-control,0.4rem)] border pr-3 pl-9 text-sm outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={state === 'sending'}
        className="bg-primary text-primary-foreground hover:bg-primary/85 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control,0.4rem)] px-5 text-sm font-semibold transition-colors disabled:opacity-70"
      >
        {state === 'sending' ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {button}
      </button>
      {state === 'failed' ? (
        <p role="alert" className="text-destructive text-xs sm:basis-full">
          {failed}
        </p>
      ) : null}
    </form>
  );
}
