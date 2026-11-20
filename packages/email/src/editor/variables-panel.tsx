'use client';

import {
  insertVariableAtCaret,
  setVariableDragData,
  useEditorContext,
} from '@builderset/engine/editor';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { flattenVariables, lookup, SYSTEM_VARIABLES, type VariableSpec } from '../core';
import { useEmail } from './context';

/**
 * The Variables tab: everything this email can say about the reader and the
 * occasion, grouped as the email type declares it, each with its example
 * value. A click puts it where the writer was typing; a drag drops it into
 * any text on the canvas.
 */

interface Group {
  key: string;
  label: string;
  variables: { path: string; label: string; example: string }[];
}

/** A value as the chip shows it: short, on one line. */
function shown(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return `${String(value.length)} ×`;
  if (typeof value === 'string') return value.slice(0, 40);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '…';
}

export function VariablesPanel() {
  const { host } = useEditorContext();
  const { type, words, sample, brand, locale } = useEmail();
  const w = words.email;
  const [query, setQuery] = useState('');

  const groups = useMemo<Group[]>(() => {
    const data = {
      brand: { name: brand.name, website: brand.website, address: brand.address },
      current_year: new Date().getFullYear(),
      ...sample,
    };
    const name = (labels: Record<string, string>) => labels[locale] ?? labels.en ?? '';
    const groupOf = (spec: VariableSpec, key: string, label: string): Group => ({
      key,
      label,
      variables: flattenVariables([spec]).map((variable) => ({
        path: variable.path,
        label: name(variable.label),
        example: shown(lookup(data, variable.path) ?? variable.example),
      })),
    });
    // A variable with parts is a group of its own (Recipient, Order); single
    // ones are gathered: the system's under General, the type's under its name.
    const gather = (specs: readonly VariableSpec[], key: string, label: string): Group[] => {
      const single = specs.filter((spec) => !spec.children?.length);
      const grouped = specs
        .filter((spec) => spec.children?.length)
        .map((spec) => groupOf(spec, `${key}.${spec.name}`, name(spec.label)));
      const loose: Group = {
        key,
        label,
        variables: single.flatMap((spec) => groupOf(spec, key, label).variables),
      };
      return loose.variables.length ? [...grouped, loose] : grouped;
    };
    return [
      ...gather(type?.variables ?? [], 'type', type ? name(type.label) : w.thisEmail),
      ...gather(SYSTEM_VARIABLES, 'system', w.general),
    ];
  }, [type, sample, brand, locale, w]);

  const needle = query.trim().toLowerCase();
  const visible = groups
    .map((group) => ({
      ...group,
      variables: group.variables.filter(
        (variable) =>
          !needle ||
          variable.path.includes(needle) ||
          variable.label.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.variables.length > 0);

  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      <div className="bst:shrink-0 bst:px-3 bst:pb-2.5">
        <label className="bst:flex bst:h-[34px] bst:items-center bst:gap-2 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:text-muted-foreground bst:transition-[border-color,box-shadow] bst:focus-within:border-primary/45">
          <Search className="bst:size-4 bst:shrink-0" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder={w.searchVariables}
            aria-label={w.searchVariables}
            className="bst:h-full bst:w-full bst:min-w-0 bst:bg-transparent bst:text-[12.5px] bst:text-foreground bst:outline-none"
          />
        </label>
      </div>
      <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:overflow-y-auto bst:pb-4">
        {visible.map((group) => (
          <section key={group.key} className="bst:pb-3">
            <h3 className="bst:flex bst:items-center bst:gap-1.5 bst:px-4 bst:pb-1.5 bst:text-xs bst:font-semibold bst:text-foreground/85">
              {group.label}
              <em className="bst:font-medium bst:text-muted-foreground bst:not-italic">
                {group.variables.length}
              </em>
            </h3>
            <div className="bst:grid bst:gap-1 bst:px-3">
              {group.variables.map((variable) => (
                <button
                  key={variable.path}
                  type="button"
                  draggable
                  title={variable.label}
                  // Keeps the caret where it is in the text being written.
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onDragStart={(event) => {
                    setVariableDragData(event.dataTransfer, variable.path);
                  }}
                  onClick={() => {
                    if (!insertVariableAtCaret(variable.path)) host.toast('info', w.clickTextFirst);
                  }}
                  className="bld-focus bst:grid bst:w-full bst:animate-[bst-rise_300ms_var(--bst-ease-enter)] bst:cursor-grab bst:grid-cols-[minmax(0,1fr)_auto] bst:items-center bst:gap-2 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:py-[7px] bst:text-left bst:transition-[border-color,translate] bst:select-none bst:hover:translate-x-0.5 bst:hover:border-primary/40 bst:active:cursor-grabbing"
                >
                  <code className="bst:truncate bst:font-mono bst:text-[11.5px] bst:font-medium bst:text-[light-dark(var(--bst-color-blue-700),var(--bst-color-blue-300))]">
                    {variable.path}
                  </code>
                  <span className="bst:max-w-[9rem] bst:truncate bst:text-[11.5px] bst:text-muted-foreground">
                    {variable.example || variable.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <p className="bst:px-4 bst:pt-1 bst:text-[11.5px] bst:leading-snug bst:text-muted-foreground">
          {w.variablesHint}
        </p>
      </div>
    </div>
  );
}
