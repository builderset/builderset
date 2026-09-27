import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Classes merged so a node's own style wins over an element's default. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
