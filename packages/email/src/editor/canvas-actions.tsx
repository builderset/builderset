'use client';

import { DockToggle, useEditorContext } from '@builderset/engine/editor';
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@builderset/engine/ui';
import { Database, Moon, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { EmailDocument } from '../core';
import { useEmail } from './context';

/**
 * The email's own controls around the canvas: in the dock, example data and
 * the dark preview; in the top bar, "Send test" when the host can send one.
 */

/** The dock's two switches. Ctrl Shift E toggles the example data. */
export function EmailDockItems() {
  const { words, view, setView } = useEmail();
  const w = words.email;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setView({ exampleData: !view.exampleData });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [view.exampleData, setView]);

  return (
    <>
      <DockToggle
        label={w.exampleData}
        keys="Ctrl Shift E"
        pressed={view.exampleData}
        onPressedChange={(exampleData) => {
          setView({ exampleData });
        }}
      >
        <Database aria-hidden="true" />
      </DockToggle>
      <DockToggle
        label={w.darkPreview}
        pressed={view.dark}
        onPressedChange={(dark) => {
          setView({ dark });
        }}
      >
        <Moon aria-hidden="true" />
      </DockToggle>
    </>
  );
}

/** "Send test": the design as it is now, to one address. */
export function SendTest() {
  const { store, host } = useEditorContext<EmailDocument>();
  const { words, onSendTest } = useEmail();
  const w = words.email;
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);
  if (!onSendTest) return null;

  const send = async () => {
    const to = address.trim();
    if (!to) return;
    setSending(true);
    try {
      const sent = await onSendTest(store.getState().doc, to);
      if (sent) {
        host.toast('success', w.testSent(to));
        setOpen(false);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Send aria-hidden="true" />}
          className="bst:h-8 bst:rounded-[9px] bst:bg-card"
        >
          <span className="bst:hidden bst:@min-[1300px]/bar:inline">{w.sendTest}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="bst:w-80 bst:p-3">
        <form
          className="bst:grid bst:gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label htmlFor="email-send-test" className="bst:text-xs bst:font-semibold">
            {w.sendTestTitle}
          </label>
          <div className="bst:flex bst:gap-1.5">
            <Input
              id="email-send-test"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
              }}
            />
            <Button type="submit" size="sm" loading={sending} disabled={!address.trim()}>
              {w.send}
            </Button>
          </div>
          <p className="bst:text-xs bst:text-muted-foreground">{w.sendTestHint}</p>
        </form>
      </PopoverContent>
    </Popover>
  );
}
