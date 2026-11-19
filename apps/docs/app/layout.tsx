import './global.css';

import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { THEME_SCRIPT } from '@/components/docs/theme';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' });
const text = Inter({ subsets: ['latin'], variable: '--font-inter' });
const code = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  metadataBase: new URL('https://docs-builderset.vercel.app'),
  title: { default: 'Builderset Docs', template: '%s — Builderset Docs' },
  description: 'Visual editors for emails and articles that fit into your project.',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0e12' },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${code.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
