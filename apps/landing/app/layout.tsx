import './global.css';

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://builderset.vercel.app'),
  title: 'Builderset — visual editors for emails and articles, inside your app',
  description:
    'Let your users design emails and articles inside your own React app. One engine for every kind of content; your theme, your language, your database.',
  openGraph: {
    title: 'Builderset',
    description: 'Visual editors for emails and articles, inside your own app.',
    url: 'https://builderset.vercel.app',
    siteName: 'Builderset',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafbfe' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0b12' },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} font-sans`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
