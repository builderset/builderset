'use client';

import { X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';

/**
 * A picture that opens full-screen. Built on the platform `<dialog>`, which
 * brings the focus trap, Escape to close and the backdrop with it — no
 * library, and nothing to get wrong about returning focus afterwards.
 */
export function Zoomable({
  children,
  full,
  enlargeLabel,
  closeLabel,
}: {
  children: ReactNode;
  full: ReactNode;
  enlargeLabel: string;
  closeLabel: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label={enlargeLabel}
        onClick={() => dialog.current?.showModal()}
        className="block w-full cursor-zoom-in overflow-hidden rounded-[inherit] [&_img]:transition-transform [&_img]:duration-500 hover:[&_img]:scale-[1.02]"
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        onClick={(event) => {
          // A press on the backdrop (the dialog itself, not its content) closes.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto max-h-[92vh] max-w-[94vw] overflow-visible bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm open:animate-[ui-zoom-in_220ms_ease-out]"
      >
        <div className="relative [&_img]:max-h-[88vh] [&_img]:w-auto [&_img]:rounded-lg">
          {full}
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => dialog.current?.close()}
            className="bg-background text-foreground absolute -top-3 -right-3 grid size-9 cursor-pointer place-items-center rounded-full shadow-lg transition-transform hover:scale-105"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </dialog>
    </>
  );
}
