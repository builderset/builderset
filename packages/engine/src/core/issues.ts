import type { NodeId } from './ids';

/**
 * Something the checker has to say about a document.
 *
 * `error` is what the server would refuse — a broken structure, an unsafe URL,
 * media that was never uploaded — and it blocks publishing. `warning` is what
 * a careful editor would fix — a missing alt text, a skipped heading level —
 * and it never blocks anything. The `code` is a message key the UI translates;
 * `params` fill its placeholders. No sentences live in the core.
 */
export interface Issue {
  severity: 'error' | 'warning';
  code: string;
  nodeId?: NodeId | undefined;
  /** Which prop, for jumping the inspector to the right field. */
  path?: string | undefined;
  params?: Record<string, string | number> | undefined;
}

export function error(code: string, extra: Omit<Issue, 'severity' | 'code'> = {}): Issue {
  return { severity: 'error', code, ...extra };
}

export function warning(code: string, extra: Omit<Issue, 'severity' | 'code'> = {}): Issue {
  return { severity: 'warning', code, ...extra };
}
