'use client';

import dynamic from 'next/dynamic';

// The editors run in the browser only, as in any project: next/dynamic, ssr: false.
const Playground = dynamic(
  () => import('@/components/playground/playground').then((module) => module.Playground),
  { ssr: false, loading: () => <p className="p-8 text-sm">Loading the editors…</p> },
);

export function PlaygroundLoader() {
  return <Playground />;
}
