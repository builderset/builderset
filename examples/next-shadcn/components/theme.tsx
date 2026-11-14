'use client';

import { ThemeProvider as NextThemes, useTheme } from 'next-themes';
import type { ReactNode } from 'react';

import { Button } from './button';

/** next-themes puts `class="dark"` on <html>; the editors' theme="auto" follows it. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemes>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="outline"
      onClick={() => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
      }}
    >
      Toggle theme
    </Button>
  );
}
