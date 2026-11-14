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
        className="bst:animate-[bst-rise_220ms_ease-out] bst:text-sm bst:font-medium bst:text-foreground"
      >
        {done}
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="bst:flex bst:w-full bst:max-w-md bst:flex-col bst:gap-2 bst:sm:flex-row"
    >
      <label className="bst:relative bst:flex-1">
        <span className="bst:sr-only">{placeholder}</span>
        <Mail
          className="bst:absolute bst:top-1/2 bst:left-3 bst:size-4 bst:-translate-y-1/2 bst:text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="email"
          name="email"
          required
          placeholder={placeholder}
          className="bst:h-11 bst:w-full bst:rounded-control bst:border bst:border-border bst:bg-background bst:pr-3 bst:pl-9 bst:text-sm bst:outline-none bst:focus:border-border-strong"
        />
      </label>
      <button
        type="submit"
        disabled={state === 'sending'}
        className="bst:inline-flex bst:h-11 bst:cursor-pointer bst:items-center bst:justify-center bst:gap-2 bst:rounded-control bst:bg-primary bst:px-5 bst:text-sm bst:font-semibold bst:text-primary-foreground bst:transition-colors bst:hover:bg-primary/85 bst:disabled:opacity-70"
      >
        {state === 'sending' ? (
          <Loader2 className="bst:size-4 bst:animate-spin" aria-hidden="true" />
        ) : null}
        {button}
      </button>
      {state === 'failed' ? (
        <p role="alert" className="bst:text-xs bst:text-destructive bst:sm:basis-full">
          {failed}
        </p>
      ) : null}
    </form>
  );
}
