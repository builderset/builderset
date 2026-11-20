'use client';

import type { MediaRef } from '../../core';
import { Search, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';

import type { UploadResult } from '../../host';
import { DRAG_TYPE_MIME, setActiveDrag, setDragChip } from '../canvas/drop';
import { cn } from '../cn';
import { useEditor, useEditorContext } from '../context';
import { Spinner } from '../ui';

/** What was uploaded in this editor, kept while it lives — across tab switches. */
const session = new WeakMap<object, UploadResult[]>();

interface Item {
  ref: MediaRef;
  url: string;
  source: 'uploaded' | 'document' | 'library';
}

function refOf(result: UploadResult): MediaRef {
  const ref: MediaRef = { key: result.key };
  if (result.width) ref.width = result.width;
  if (result.height) ref.height = result.height;
  if (result.mime) ref.mime = result.mime;
  if (result.size) ref.size = result.size;
  if (result.name) ref.name = result.name;
  return ref;
}

const nameOf = (ref: MediaRef) => ref.name ?? ref.key.split('/').pop() ?? ref.key;
const sizeOf = (ref: MediaRef) =>
  ref.width && ref.height ? `${String(ref.width)} × ${String(ref.height)}` : '';

/**
 * The pictures at hand: uploaded now, already in the document, and the
 * project's library when the host has one. Drag one onto the page, or click
 * it to add it below the selected block, as an image block.
 */
export function MediaPanel() {
  const { host, store, messages, registry } = useEditorContext();
  const doc = useEditor((state) => state.doc);
  const [library, setLibrary] = useState<UploadResult[] | null>(host.listMedia ? null : []);
  const [uploaded, setUploaded] = useState<UploadResult[]>(() => session.get(store) ?? []);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!host.listMedia) return;
    let alive = true;
    host
      .listMedia()
      .then((rows) => {
        if (alive) setLibrary(rows);
      })
      .catch(() => {
        if (alive) setLibrary([]);
      });
    return () => {
      alive = false;
    };
  }, [host]);

  // Every picture the document's blocks point at, by the elements' own account.
  const used = useMemo(() => {
    const refs: MediaRef[] = [];
    for (const node of Object.values(doc.nodes)) {
      const definition = registry.get(node.type);
      if (definition?.media) refs.push(...definition.media(node.props));
    }
    return refs;
  }, [doc, registry]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: Item[] = [];
    const push = (ref: MediaRef, url: string, source: Item['source']) => {
      if (seen.has(ref.key) || (ref.mime && !ref.mime.startsWith('image/'))) return;
      seen.add(ref.key);
      out.push({ ref, url, source });
    };
    for (const result of uploaded) push(refOf(result), result.url, 'uploaded');
    for (const ref of used) push(ref, host.resolveMedia(ref.key), 'document');
    for (const result of library ?? []) push(refOf(result), result.url, 'library');
    const q = query.trim().toLowerCase();
    return q ? out.filter((item) => nameOf(item.ref).toLowerCase().includes(q)) : out;
  }, [uploaded, used, library, host, query]);

  const upload = (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      setBusy((count) => count + 1);
      host
        .upload(file, 'image', () => undefined, new AbortController().signal)
        .then((result) => {
          const done = { ...result, name: result.name ?? file.name };
          setUploaded((current) => {
            const next = [done, ...current];
            session.set(store, next);
            return next;
          });
        })
        .catch(() => {
          host.toast('error', messages.uploadFailed);
        })
        .finally(() => {
          setBusy((count) => count - 1);
        });
    }
  };

  const insert = (item: Item) => {
    store.getState().insertElement('image', undefined, { media: item.ref });
  };

  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files');
  const groups: { title: string; source: Item['source'] }[] = [
    { title: messages.justUploaded, source: 'uploaded' },
    { title: messages.inDocument, source: 'document' },
    { title: messages.mediaLibrary, source: 'library' },
  ];

  return (
    <div className="bst:flex bst:h-full bst:flex-col">
      <div className="bst:px-3 bst:pb-2.5">
        <label className="bst:flex bst:h-[34px] bst:items-center bst:gap-2 bst:rounded-[9px] bst:border bst:border-border bst:bg-card bst:px-2.5 bst:text-muted-foreground bst:focus-within:border-primary/45">
          <Search className="bst:size-4 bst:shrink-0" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={messages.searchMedia}
            aria-label={messages.searchMedia}
            className="bst:h-full bst:w-full bst:min-w-0 bst:bg-transparent bst:text-[12.5px] bst:text-foreground bst:outline-none"
          />
        </label>
      </div>
      <div className="bld-scroll bst:min-h-0 bst:flex-1 bst:overflow-y-auto bst:px-3 bst:pb-4">
        <label
          onDragOver={(event) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => {
            setOver(false);
          }}
          onDrop={(event) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            setOver(false);
            upload(event.dataTransfer.files);
          }}
          className={cn(
            'bst:mb-3 bst:grid bst:cursor-pointer bst:justify-items-center bst:gap-1 bst:rounded-xl bst:border-[1.5px] bst:border-dashed bst:p-4 bst:text-center bst:text-xs bst:transition-colors',
            over
              ? 'bst:border-primary bst:bg-primary/8 bst:text-primary'
              : 'bst:border-border-strong bst:text-muted-foreground bst:hover:border-primary bst:hover:bg-primary/8 bst:hover:text-primary',
          )}
        >
          {busy ? <Spinner /> : <Upload className="bst:size-[18px]" aria-hidden="true" />}
          <b className="bst:text-[12.5px] bst:font-semibold">{messages.dropFiles}</b>
          <span>{messages.fileHint}</span>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) upload(event.target.files);
              event.target.value = '';
            }}
          />
        </label>

        {library === null ? (
          <div className="bst:flex bst:justify-center bst:py-4">
            <Spinner />
          </div>
        ) : null}
        {items.length === 0 && library !== null ? (
          <p className="bst:px-2 bst:py-4 bst:text-center bst:text-xs bst:text-muted-foreground">
            {messages.noMedia}
          </p>
        ) : null}

        {groups.map((group) => {
          const inGroup = items.filter((item) => item.source === group.source);
          if (inGroup.length === 0) return null;
          return (
            <section key={group.source} className="bst:pb-3">
              <h3 className="bst:px-1 bst:pt-1 bst:pb-1.5 bst:text-xs bst:font-semibold bst:text-foreground/85">
                {group.title}{' '}
                <em className="bst:font-medium bst:text-muted-foreground bst:not-italic">
                  {inGroup.length}
                </em>
              </h3>
              <div className="bst:grid bst:grid-cols-2 bst:gap-2">
                {inGroup.map((item) => (
                  <button
                    key={item.ref.key}
                    type="button"
                    title={messages.dragToPage}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_TYPE_MIME, 'image');
                      event.dataTransfer.effectAllowed = 'copy';
                      setDragChip(event.dataTransfer, nameOf(item.ref), {
                        icon: 'image',
                        detail: sizeOf(item.ref),
                      });
                      setActiveDrag({ kind: 'type', type: 'image', props: { media: item.ref } });
                    }}
                    onDragEnd={() => {
                      setActiveDrag(null);
                    }}
                    onClick={() => {
                      insert(item);
                    }}
                    className="bst:cursor-grab bst:overflow-hidden bst:rounded-[10px] bst:border bst:border-border bst:bg-card bst:text-left bst:transition-[transform,box-shadow] bst:duration-200 bst:ease-[cubic-bezier(.34,1.4,.5,1)] bst:select-none bst:hover:-translate-y-0.5 bst:hover:shadow-[0_1px_2px_rgb(20_23_30/0.06),0_8px_24px_rgb(20_23_30/0.08)] bst:active:cursor-grabbing"
                  >
                    <span
                      className="bst:block bst:aspect-[4/3] bst:bg-muted bst:bg-cover bst:bg-center"
                      style={{ backgroundImage: `url("${item.url}")` }}
                    />
                    <span className="bst:block bst:px-2 bst:py-1.5">
                      <b className="bst:block bst:truncate bst:text-[11.5px] bst:font-semibold">
                        {nameOf(item.ref)}
                      </b>
                      <small className="bst:block bst:text-[10.5px] bst:text-muted-foreground">
                        {sizeOf(item.ref) || '—'}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
