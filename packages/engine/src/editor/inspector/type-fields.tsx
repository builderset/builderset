'use client';

import { Label } from '../ui';
import { Popover, PopoverContent, PopoverTrigger } from '@motors/ui';
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Check,
  ChevronsUpDown,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState } from 'react';

import { cn } from '../cn';
import { useEditorContext } from '../context';
import { humanize } from '../messages';
import { useStylesheet } from '../use-stylesheet';

/**
 * Typography and position controls: a font picker that shows each font in
 * itself, and alignment as icons rather than a list of words.
 */

const ALIGN_ICONS: Record<string, LucideIcon> = {
  left: AlignLeft,
  start: AlignLeft,
  center: AlignCenter,
  middle: AlignVerticalJustifyCenter,
  right: AlignRight,
  end: AlignRight,
  justify: AlignJustify,
  stretch: AlignHorizontalJustifyCenter,
  top: AlignVerticalJustifyStart,
  bottom: AlignVerticalJustifyEnd,
};

export function isAlignField(name: string, options: readonly string[]): boolean {
  return /align$/i.test(name) && options.every((option) => option in ALIGN_ICONS);
}

export function AlignField({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string | undefined;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const { messages } = useEditorContext();
  const label = messages.fieldLabels[name] ?? messages.styleKeys[name] ?? humanize(name);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <AlignButtons value={value} options={options} onChange={onChange} label={label} />
    </div>
  );
}

/** The row of alignment icons — also used by the block toolbar. */
export function AlignButtons({
  value,
  options,
  onChange,
  label,
  tone = 'panel',
}: {
  value: string | undefined;
  options: readonly string[];
  onChange: (value: string) => void;
  label: string;
  tone?: 'panel' | 'toolbar';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'flex gap-0.5',
        tone === 'panel' &&
          'border-border bg-muted/40 w-full rounded-[var(--radius-control)] border p-0.5',
      )}
    >
      {options.map((option) => {
        const Icon = ALIGN_ICONS[option] ?? AlignLeft;
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={humanize(option)}
            title={humanize(option)}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onChange(option);
            }}
            className={cn(
              'flex items-center justify-center rounded-md transition-[background-color,color,transform] active:scale-90 [&_svg]:size-3.5',
              tone === 'panel' ? 'h-7 flex-1' : 'size-7',
              tone === 'panel'
                ? active
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
                : active
                  ? 'bg-white/20'
                  : 'hover:bg-white/15',
            )}
          >
            <Icon aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export function isFontField(name: string): boolean {
  return name === 'font';
}

/** A searchable font list, each font drawn in itself, grouped by kind. */
export function FontField({
  value,
  onChange,
  nullable,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  nullable: boolean;
}) {
  const { profile, messages } = useEditorContext();
  const fonts = profile.fonts ?? [];
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = fonts.find((font) => font.key === value);
  const shown = fonts.filter((font) =>
    font.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const groups = [...new Set(shown.map((font) => font.category))];
  // The previews need every font loaded — only once the list has been opened.
  useStylesheet(open ? profile.fontsPreviewUrl : null);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {messages.fieldLabels.font ?? humanize('font')}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="border-input bg-background hover:bg-accent/40 flex h-9 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border px-3 text-left text-sm"
          >
            <span className="truncate" style={current ? { fontFamily: current.stack } : undefined}>
              {current?.label ?? messages.inheritFont}
            </span>
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-1">
          <div className="border-border mb-1 flex items-center gap-2 border-b px-2 pb-1.5">
            <Search className="text-muted-foreground size-4" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={messages.searchFonts}
              className="h-8 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {nullable ? (
              <FontOption
                label={messages.inheritFont}
                active={!value}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              />
            ) : null}
            {groups.map((group) => (
              <div key={group}>
                <p className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase">
                  {messages.fontGroups[group] ?? group}
                </p>
                {shown
                  .filter((font) => font.category === group)
                  .map((font) => (
                    <FontOption
                      key={font.key}
                      label={font.label}
                      stack={font.stack}
                      web={font.web}
                      active={font.key === value}
                      onSelect={() => {
                        onChange(font.key);
                        setOpen(false);
                      }}
                    />
                  ))}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FontOption({
  label,
  stack,
  web,
  active,
  onSelect,
}: {
  label: string;
  stack?: string | undefined;
  web?: boolean | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const { messages } = useEditorContext();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-left',
        active ? 'bg-accent' : 'hover:bg-accent/60',
      )}
    >
      <span
        className="min-w-0 flex-1 truncate text-[15px]"
        style={stack ? { fontFamily: stack } : undefined}
      >
        {label}
      </span>
      {web ? (
        <span className="text-muted-foreground shrink-0 text-[10px]" title={messages.webFontHint}>
          web
        </span>
      ) : null}
      {active ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}
