import type { SeenRecord } from '../core';

/**
 * What a browser remembers for the display rules: when each popup was last
 * shown, closed or filled in, this visit's session, and whether the visitor
 * came before. `PopupView` takes any `PopupStore`; the default keeps it in
 * `localStorage` and `sessionStorage`, and a host with its own consent rules
 * or a server-side record passes its own.
 */
export interface PopupStore {
  read(key: string): SeenRecord | null;
  write(key: string, record: SeenRecord): void;
  /** This visit's id: the same until the tab is closed. */
  session(): string;
  /** The visitor was here in an earlier session. */
  returning(): boolean;
}

const PREFIX = 'bsp:';

function randomId(): string {
  return Math.random().toString(36).slice(2, 12);
}

/** Storage that may be missing or refuse (a private window, blocked cookies): then nothing is kept. */
function safe(get: () => Storage): Pick<Storage, 'getItem' | 'setItem'> {
  return {
    getItem: (key) => {
      try {
        return get().getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        get().setItem(key, value);
      } catch {
        // Not kept: the popup then shows as to a first-time visitor.
      }
    },
  };
}

function parse(raw: string | null): SeenRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

/** The browser's own storage: records in `localStorage`, the session in `sessionStorage`. */
export function browserStore(): PopupStore {
  const local = safe(() => window.localStorage);
  const tab = safe(() => window.sessionStorage);
  let current: string | null = null;
  const session = () => {
    current ??= tab.getItem(`${PREFIX}session`);
    if (!current) {
      current = randomId();
      tab.setItem(`${PREFIX}session`, current);
    }
    return current;
  };
  return {
    read: (key) => parse(local.getItem(PREFIX + key)),
    write: (key, record) => {
      local.setItem(PREFIX + key, JSON.stringify(record));
    },
    session,
    returning: () => {
      const first = local.getItem(`${PREFIX}first-session`);
      if (!first) {
        local.setItem(`${PREFIX}first-session`, session());
        return false;
      }
      return first !== session();
    },
  };
}

/** A store that forgets on reload: previews, tests, a server render. */
export function memoryStore(
  records: Record<string, SeenRecord> = {},
  options: { session?: string; returning?: boolean } = {},
): PopupStore {
  const kept = new Map(Object.entries(records));
  return {
    read: (key) => kept.get(key) ?? null,
    write: (key, record) => {
      kept.set(key, record);
    },
    session: () => options.session ?? 'memory',
    returning: () => options.returning ?? false,
  };
}
