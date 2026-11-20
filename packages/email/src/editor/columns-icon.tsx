/** A row's column widths as a small diagram: the Structures tiles, the module cards. */
export function ColumnsIcon({ widths }: { widths: readonly number[] }) {
  return (
    <span className="bst:flex bst:h-6 bst:w-16 bst:gap-0.5" aria-hidden="true">
      {widths.map((width, index) => (
        <span
          key={index}
          className="bst:rounded-[2px] bst:bg-muted-foreground/35 bst:transition-colors bst:group-hover:bg-primary/60"
          style={{ flex: `${String(width)} 1 0` }}
        />
      ))}
    </span>
  );
}
