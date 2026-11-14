import Link from 'next/link';

import { Button } from './button';
import { ThemeToggle } from './theme';

/** The project's own page, with shadcn buttons: the editors must not change it. */
export function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Builderset in Next.js, with shadcn</h1>
      <div className="flex gap-3">
        <Button>A button of the project&apos;s own</Button>
        <ThemeToggle />
      </div>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <Link className="underline" href="/emails/welcome/edit">
            Edit an email
          </Link>{' '}
          — saved through the REST API in app/api
        </li>
        <li>
          <Link className="underline" href="/articles/kitchen-sink/edit">
            Edit an article
          </Link>{' '}
          — from the builderset package
        </li>
        <li>
          <Link className="underline" href="/blog/kitchen-sink">
            Read the article
          </Link>{' '}
          — a Server Component
        </li>
        <li>
          <Link className="underline" href="/settings">
            Settings
          </Link>{' '}
          — another page of the project&apos;s own
        </li>
      </ul>
    </main>
  );
}
