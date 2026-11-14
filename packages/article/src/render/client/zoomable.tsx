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
        className="bst:block bst:w-full bst:cursor-zoom-in bst:overflow-hidden bst:rounded-[inherit] bst:[&_img]:transition-transform bst:[&_img]:duration-500 bst:hover:[&_img]:scale-[1.02]"
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        onClick={(event) => {
          // A press on the backdrop (the dialog itself, not its content) closes.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="bst:m-auto bst:max-h-[92vh] bst:max-w-[94vw] bst:overflow-visible bst:bg-transparent bst:p-0 bst:backdrop:bg-black/80 bst:backdrop:backdrop-blur-sm bst:open:animate-[bst-zoom-in_220ms_ease-out]"
      >
        <div className="bst:relative bst:[&_img]:max-h-[88vh] bst:[&_img]:w-auto bst:[&_img]:rounded-lg">
          {full}
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => dialog.current?.close()}
            className="bst:absolute bst:-top-3 bst:-right-3 bst:grid bst:size-9 bst:cursor-pointer bst:place-items-center bst:rounded-full bst:bg-background bst:text-foreground bst:shadow-lg bst:transition-transform bst:hover:scale-105"
          >
            <X className="bst:size-4" aria-hidden="true" />
          </button>
        </div>
      </dialog>
    </>
  );
}
