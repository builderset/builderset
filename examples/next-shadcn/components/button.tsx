import type { ComponentProps } from 'react';

/** The project's own button, the shadcn way. */
export function Button({
  variant = 'default',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: 'default' | 'outline' }) {
  const look =
    variant === 'outline'
      ? 'border border-border bg-background hover:bg-accent hover:text-accent-foreground'
      : 'bg-primary text-primary-foreground hover:bg-primary/90';
  return (
    <button
      data-shadcn-button=""
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors ${look} ${className}`}
      {...props}
    />
  );
}
