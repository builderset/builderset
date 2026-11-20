'use client';

import { richTextToPlain, type RichText } from '../../core';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Eye,
  History,
  Keyboard,
  Maximize2,
  Monitor,
  PanelLeft,
  PanelRight,
  Redo2,
  Rocket,
  Save,
  Search,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { cn } from '../cn';
import { useEditorContext } from '../context';
import { ElementIcon } from '../icons';
import { elementChoices } from '../text/slash-menu';
import { usePortalContainer } from '../ui';

interface Command {
  group: string;
  label: string;
  icon: ReactNode;
  keys?: string;
  run: () => void;
}

export interface CommandActions {
  onPublish: () => void;
  onSave: () => void;
  onFocus: () => void;
  onShortcuts: () => void;
  onPreview?: (() => void) | undefined;
  onHistory?: (() => void) | undefined;
}

/**
 * Ctrl K: every action, every heading to jump to, every block to insert — in
 * one list that filters as you type and runs with Enter.
 */
export function CommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: CommandActions;
}) {
  const container = usePortalContainer();
  const { store, messages, registry, record } = useEditorContext();
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  // Built when it opens: the headings and the selection are the ones of now.
  const commands = useMemo<Command[]>(() => {
    if (!open) return [];
    const state = store.getState();
    const go = (fn: () => void) => () => {
      fn();
    };
    const a = messages.commandActions;
    const published = record.status === 'published';
    const items: Command[] = [
      {
        group: a,
        label: published ? messages.update : messages.publish,
        icon: <Rocket />,
        keys: 'Ctrl Enter',
        run: actions.onPublish,
      },
      { group: a, label: messages.saveDraft, icon: <Save />, keys: 'Ctrl S', run: actions.onSave },
    ];
    if (actions.onPreview)
      items.push({ group: a, label: messages.preview, icon: <Eye />, run: actions.onPreview });
    if (actions.onHistory)
      items.push({
        group: a,
        label: messages.revisions,
        icon: <History />,
        run: actions.onHistory,
      });
    items.push(
      {
        group: a,
        label: messages.focusMode,
        icon: <Maximize2 />,
        keys: 'Ctrl \\',
        run: actions.onFocus,
      },
      {
        group: a,
        label: messages.add,
        icon: <PanelLeft />,
        keys: '[',
        run: go(() => {
          store.getState().toggleLeft();
        }),
      },
      {
        group: a,
        label: messages.settings,
        icon: <PanelRight />,
        keys: ']',
        run: go(() => {
          store.getState().toggleRight();
        }),
      },
      {
        group: a,
        label: messages.desktop,
        icon: <Monitor />,
        keys: 'Ctrl 1',
        run: go(() => {
          store.getState().setViewport('desktop');
        }),
      },
      {
        group: a,
        label: messages.tablet,
        icon: <Tablet />,
        keys: 'Ctrl 2',
        run: go(() => {
          store.getState().setViewport('tablet');
        }),
      },
      {
        group: a,
        label: messages.mobile,
        icon: <Smartphone />,
        keys: 'Ctrl 3',
        run: go(() => {
          store.getState().setViewport('mobile');
        }),
      },
      {
        group: a,
        label: messages.undo,
        icon: <Undo2 />,
        keys: 'Ctrl Z',
        run: () => {
          store.getState().undo();
        },
      },
      {
        group: a,
        label: messages.redo,
        icon: <Redo2 />,
        keys: 'Ctrl ⇧ Z',
        run: () => {
          store.getState().redo();
        },
      },
      {
        group: a,
        label: messages.shortcuts,
        icon: <Keyboard />,
        keys: '?',
        run: actions.onShortcuts,
      },
    );

    // Every heading, in reading order, to jump to.
    const walk = (id: string) => {
      const node = state.view.nodes[id];
      if (!node) return;
      if (node.type === 'heading') {
        const text = Array.isArray(node.props.text)
          ? richTextToPlain(node.props.text as RichText)
          : typeof node.props.text === 'string'
            ? node.props.text
            : '';
        if (text.trim()) {
          const level = typeof node.props.level === 'number' ? `H${String(node.props.level)}` : '';
          items.push({
            group: messages.commandGoTo,
            label: text.trim(),
            icon: <ElementIcon name="heading" />,
            keys: level,
            run: () => {
              store.getState().select([id]);
              document
                .querySelector(`[data-node="${CSS.escape(id)}"]`)
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            },
          });
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(state.view.root);

    // Every block the library offers.
    for (const choice of elementChoices(registry, messages)) {
      items.push({
        group: messages.commandInsert,
        label: choice.name,
        icon: <ElementIcon name={choice.icon} />,
        run: () => {
          store.getState().insertElement(choice.type);
        },
      });
    }
    return items;
  }, [open, store, messages, registry, record.status, actions]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 60);
    return commands.filter((command) => command.label.toLowerCase().includes(q)).slice(0, 60);
  }, [commands, query]);

  useEffect(() => {
    setAt(0);
  }, [query, open]);
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);
  useEffect(() => {
    list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [at]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    // After the dialog has let go of focus, so a jump or an insert keeps it.
    requestAnimationFrame(() => {
      command.run();
    });
  };

  let group = '';
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Overlay className="bst:fixed bst:inset-0 bst:z-50 bst:bg-(--bst-scrim) bst:data-[state=open]:animate-[bst-fade-in_200ms_var(--bst-ease-enter)]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="bst:fixed bst:top-[12vh] bst:left-1/2 bst:z-50 bst:w-[min(620px,calc(100%-32px))] bst:-translate-x-1/2 bst:overflow-hidden bst:rounded-2xl bst:border bst:border-border bst:bg-card bst:text-foreground bst:shadow-[0_2px_6px_rgb(20_23_30/0.08),0_24px_60px_rgb(20_23_30/0.18)] bst:outline-none bst:data-[state=open]:animate-[bst-palette-in_300ms_cubic-bezier(.34,1.4,.5,1)]"
        >
          <DialogPrimitive.Title className="bst:sr-only">
            {messages.commandSearch}
          </DialogPrimitive.Title>
          <label className="bst:flex bst:h-[52px] bst:items-center bst:gap-2.5 bst:border-b bst:border-border bst:px-4 bst:text-muted-foreground">
            <Search className="bst:size-4 bst:shrink-0" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              placeholder={messages.commandPlaceholder}
              aria-label={messages.commandPlaceholder}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setAt((value) => Math.min(shown.length - 1, value + 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setAt((value) => Math.max(0, value - 1));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  run(shown[at]);
                }
              }}
              className="bst:h-full bst:flex-1 bst:bg-transparent bst:text-[15px] bst:text-foreground bst:outline-none"
            />
            <kbd className="bst:rounded-[5px] bst:border bst:border-border bst:bg-background bst:px-[5px] bst:py-[3px] bst:font-mono bst:text-[11px] bst:leading-none">
              Esc
            </kbd>
          </label>
          <div ref={list} className="bst:max-h-[380px] bst:overflow-y-auto bst:p-1.5">
            {shown.length === 0 ? (
              <p className="bst:px-2.5 bst:py-2 bst:text-[11px] bst:font-semibold bst:text-muted-foreground">
                {messages.commandNothing}
              </p>
            ) : (
              shown.map((command, index) => {
                const head = command.group !== group;
                group = command.group;
                return (
                  <div key={`${command.group}:${command.label}:${String(index)}`}>
                    {head ? (
                      <p className="bst:px-2.5 bst:pt-2 bst:pb-1 bst:text-[11px] bst:font-semibold bst:text-muted-foreground">
                        {command.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      data-active={index === at}
                      onMouseMove={() => {
                        setAt(index);
                      }}
                      onClick={() => {
                        run(command);
                      }}
                      className={cn(
                        'bst:flex bst:h-[38px] bst:w-full bst:cursor-pointer bst:items-center bst:gap-3 bst:rounded-[9px] bst:px-2.5 bst:text-left bst:text-[13.5px] bst:[&_svg]:size-4 bst:[&_svg]:shrink-0',
                        index === at
                          ? 'bst:bg-primary/12 bst:text-primary'
                          : 'bst:[&_svg]:text-muted-foreground',
                      )}
                    >
                      {command.icon}
                      <span className="bst:min-w-0 bst:flex-1 bst:truncate">{command.label}</span>
                      {command.keys ? (
                        <small className="bst:text-xs bst:text-muted-foreground">
                          {command.keys}
                        </small>
                      ) : null}
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <div className="bst:flex bst:gap-3.5 bst:border-t bst:border-border bst:px-4 bst:py-[9px] bst:text-[11.5px] bst:text-muted-foreground">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> {messages.commandMove}
            </span>
            <span>
              <Kbd>Enter</Kbd> {messages.commandRun}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="bst:rounded-[5px] bst:border bst:border-border bst:bg-background bst:px-[5px] bst:py-[3px] bst:font-mono bst:text-[11px] bst:leading-none">
      {children}
    </kbd>
  );
}
