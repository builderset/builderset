import { redirect } from 'next/navigation';

// The docs site starts at the docs; the landing page is its own site,
// builderset.vercel.app.
export default function HomePage() {
  redirect('/docs');
}
