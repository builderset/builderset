'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Where everything that floats — menus, popovers, tooltips, selects, dialogs —
 * is portalled: an element the editor renders, rather than `<body>`. Step 10
 * of the Builderset plan sets the editor's theme on it, so the floating parts
 * get the same colours as the rest of the editor wherever it is mounted.
 *
 * Until the element has mounted (the first render), `usePortalContainer()`
 * is null and Radix falls back to `<body>`.
 */
const PortalContext = createContext<HTMLElement | null>(null);

/** Rendered once by `<BuilderEditor>`. */
export function PortalProvider({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <PortalContext.Provider value={container}>
      {children}
      <div ref={setContainer} data-builderset-portal="" />
    </PortalContext.Provider>
  );
}

export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContext);
}
