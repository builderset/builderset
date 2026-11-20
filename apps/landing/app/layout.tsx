import './global.css';

import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { HEAD_SCRIPT } from '@/components/theme';

// The docs site's three faces: display, text and code.
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' });
const text = Inter({ subsets: ['latin'], variable: '--font-inter' });
const code = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

const DESCRIPTION =
  'Let your users design articles, emails, forms, cards and popups inside your own React app. The editor, the renderer and the checker; your theme, your language, your database.';

export const metadata: Metadata = {
  metadataBase: new URL('https://builderset.vercel.app'),
  title:
    'Builderset — visual editors for articles, emails, forms, cards and popups, inside your app',
  description: DESCRIPTION,
  applicationName: 'Builderset',
  openGraph: {
    title: 'Builderset',
    description:
      'Visual editors for articles, emails, forms, cards and popups, inside your own app.',
    url: 'https://builderset.vercel.app',
    siteName: 'Builderset',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
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
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
