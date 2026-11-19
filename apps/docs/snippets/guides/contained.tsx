import type { ReactNode } from 'react';

/**
 * The editor fills the window (it is `position: fixed; inset: 0`). To keep it
 * inside a box of your page instead — under your own header, beside a sidebar —
 * give the box a size and `contain: layout`, and the editor's root `h-full`
 * (`className="h-full"`, or `height: 100%`).
 */
export function EditorBox({ children }: { children: ReactNode }) {
  return <div style={{ height: 'calc(100dvh - 4rem)', contain: 'layout' }}>{children}</div>;
}
