import type { Metadata } from 'next';

import { PlaygroundLoader } from './loader';

export const metadata: Metadata = {
  title: 'Playground',
  description:
    'Every editor in your browser — email, article, form, card and popup: change the theme, the language and the template, and copy the code.',
};

export default function Page() {
  return <PlaygroundLoader />;
}
