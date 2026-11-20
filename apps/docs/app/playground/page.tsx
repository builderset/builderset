import type { Metadata } from 'next';

import { PlaygroundLoader } from './loader';

export const metadata: Metadata = {
  title: 'Playground',
  description:
    'Both editors in your browser: change the theme, the language and the template, and copy the code.',
};

export default function Page() {
  return <PlaygroundLoader />;
}
