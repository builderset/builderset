import Link from 'next/link';

// A placeholder until the landing page (step 16, part 6): one sentence and the way in.
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">Builderset</h1>
      <p className="max-w-xl text-fd-muted-foreground">
        Visual editors for emails and articles that fit into your project — your theme, your
        language, your database.
      </p>
      <Link
        href="/docs/quick-start/email"
        className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
      >
        Quick start
      </Link>
    </div>
  );
}
