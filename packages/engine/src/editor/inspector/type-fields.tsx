'use client';

import { Label, Popover, PopoverContent, PopoverTrigger } from '../ui';
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
    <div className="bst:space-y-1.5">
      <Label className="bst:text-xs bst:font-medium">{label}</Label>
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
  /** The selected option, if any. */
  value: string | undefined;
  /** The alignments offered, in order (`'left'`, `'center'`, …); each is drawn as its icon. */
  options: readonly string[];
  /** Called with the option the writer clicks. */
  onChange: (value: string) => void;
  /** The group's accessible name. */
  label: string;
  /** `panel`: a full-width framed strip; `toolbar`: bare buttons for the block toolbar. Default: `'panel'`. */
  tone?: 'panel' | 'toolbar';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'bst:flex bst:gap-0.5',
        tone === 'panel' &&
          'bst:w-full bst:rounded-control bst:border bst:border-border bst:bg-muted/40 bst:p-0.5',
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
              'bst:flex bst:items-center bst:justify-center bst:rounded-md bst:transition-[background-color,color,transform] bst:active:scale-90 bst:[&_svg]:size-3.5',
              tone === 'panel' ? 'bst:h-7 bst:flex-1' : 'bst:size-7',
              tone === 'panel'
                ? active
                  ? 'bst:bg-background bst:text-foreground bst:shadow-xs'
                  : 'bst:text-muted-foreground bst:hover:text-foreground'
                : active
                  ? 'bst:bg-white/20'
                  : 'bst:hover:bg-white/15',
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
  /** The selected font's key, from the profile's fonts; empty means the inherited font. */
  value: string | null | undefined;
  /** Called with the picked font's key, or `null` for the inherited font. */
  onChange: (value: string | null) => void;
  /** Offers the inherited font at the top of the list, which clears the choice. */
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
    <div className="bst:space-y-1.5">
      <Label htmlFor={id} className="bst:text-xs bst:font-medium">
        {messages.fieldLabels.font ?? humanize('font')}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="bst:flex bst:h-9 bst:w-full bst:items-center bst:justify-between bst:gap-2 bst:rounded-control bst:border bst:border-input bst:bg-background bst:px-3 bst:text-left bst:text-sm bst:hover:bg-accent/40"
          >
            <span
              className="bst:truncate"
              style={current ? { fontFamily: current.stack } : undefined}
            >
              {current?.label ?? messages.inheritFont}
            </span>
            <ChevronsUpDown
              className="bst:size-4 bst:shrink-0 bst:text-muted-foreground"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="bst:w-72 bst:p-1">
          <div className="bst:mb-1 bst:flex bst:items-center bst:gap-2 bst:border-b bst:border-border bst:px-2 bst:pb-1.5">
            <Search className="bst:size-4 bst:text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={messages.searchFonts}
              className="bst:h-8 bst:w-full bst:bg-transparent bst:text-sm bst:outline-none"
            />
          </div>
          <div className="bst:max-h-80 bst:overflow-y-auto">
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
                <p className="bst:px-2 bst:pt-2 bst:pb-1 bst:text-[10px] bst:font-semibold bst:tracking-wider bst:text-muted-foreground bst:uppercase">
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
        'bst:flex bst:w-full bst:cursor-pointer bst:items-center bst:gap-2 bst:rounded-control bst:px-2 bst:py-1.5 bst:text-left',
        active ? 'bst:bg-accent' : 'bst:hover:bg-accent/60',
      )}
    >
      <span
        className="bst:min-w-0 bst:flex-1 bst:truncate bst:text-[15px]"
        style={stack ? { fontFamily: stack } : undefined}
      >
        {label}
      </span>
      {web ? (
        <span
          className="bst:shrink-0 bst:text-[10px] bst:text-muted-foreground"
          title={messages.webFontHint}
        >
          web
        </span>
      ) : null}
      {active ? <Check className="bst:size-4 bst:shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}
