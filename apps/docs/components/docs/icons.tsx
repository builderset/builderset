/** The few line icons the docs use, drawn on a 24px grid with the current colour. */
const PATHS = {
  // The groups: a set of blocks being placed, a folded guide, an index.
  start: 'M4 4h7v7H4zM13 13h7v7h-7zM15.5 4.5l4 4-4 4-4-4z',
  guides: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM19 18v3H6M8 7h7M8 11h5',
  reference: 'M5 4h14v16H5zM9 8h6M9 12h6M9 16h3',
  page: 'M7 3h7l4 4v14H7zM14 3v4h4',
  heading: 'M5 4v16M19 4v16M5 12h14',
  text: 'M4 6h16M4 12h16M4 18h10',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  panel: 'M4 5h16v14H4zM9.5 5v14',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  chevron: 'M6 9l6 6 6-6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  github:
    'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  play: 'M6 4l14 8-14 8z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  markdown: 'M3 6h18v12H3zM7 15V9l2.5 3L12 9v6M16 9v6M14 13l2 2 2-2',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
