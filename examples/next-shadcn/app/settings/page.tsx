import { Button } from '@/components/button';
import { ThemeToggle } from '@/components/theme';

export default function Settings() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-muted-foreground">
        A page of the project&apos;s own, with no editor on it.
      </p>
      <div className="flex gap-3">
        <Button>Save</Button>
        <ThemeToggle />
      </div>
    </main>
  );
}
