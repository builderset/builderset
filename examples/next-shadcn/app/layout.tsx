import type { ReactNode } from 'react';

import { ThemeProvider } from '@/components/theme';
import './globals.css';

export const metadata = { title: 'Builderset — Next.js and shadcn' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
