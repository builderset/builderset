'use client';

import type { Fragment } from '@motors/engine';
import { useEditorContext } from '@motors/engine/editor';
import { importEmailHtml, type EmailDocument } from '../core';
import {
  Button,
  DrawerPanel,
  Overlay,
  OverlayBody,
  OverlayDescription,
  OverlayFooter,
  barButtonClass,
  OverlayHeader,
  OverlayTitle,
  SegmentedControl,
  Textarea,
} from '@motors/ui';
import { FileCode2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useEmail } from './context';

/**
 * Paste an email's HTML — or pick an `.html` file — and get it back as blocks.
 *
 * REPLACE swaps the whole design (keeping the name, subject and preheader);
 * ADD puts the imported sections under the current ones. Either is one undo
 * step. Pictures are then copied into our own storage one by one, through the
 * host, and filled in as they arrive.
 */
export function ImportHtmlDialog({
  open,
  onClose,
  initialHtml = '',
}: {
  open: boolean;
  onClose: () => void;
  initialHtml?: string | undefined;
}) {
  const { store, registry, host } = useEditorContext<EmailDocument>();
  const { words } = useEmail();
  const w = words.importHtml;
  const [html, setHtml] = useState(initialHtml);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const [seeded, setSeeded] = useState(initialHtml);
  if (initialHtml !== seeded) {
    setSeeded(initialHtml);
    setHtml(initialHtml);
  }

  const run = async () => {
    const source = html.trim();
    if (!source) return;
    setBusy(true);
    try {
      const current = store.getState().doc;
      const result = importEmailHtml(source, registry, { meta: current.meta });
      if (result.blocks === 0) {
        host.toast('error', w.nothingFound);
        return;
      }
      const imported = result.document;
      const state = store.getState();
      if (mode === 'replace') {
        state.replaceDocument(
          {
            ...imported,
            meta: current.meta,
            settings: { ...current.settings, backdrop: imported.settings.backdrop },
          },
          { keepHistory: true, label: w.title },
        );
      } else {
        const rootChildren = imported.nodes[imported.root]?.children ?? [];
        const nodes: Fragment['nodes'] = {};
        for (const [id, node] of Object.entries(imported.nodes))
          if (id !== imported.root) nodes[id] = node;
        const children = state.doc.nodes[state.doc.root]?.children ?? [];
        state.insertFragment(
          { roots: rootChildren, nodes },
          { parentId: state.doc.root, index: children.length },
          w.title,
        );
      }
      host.toast('success', w.done(result.blocks));
      onClose();
      setHtml('');

      // The pictures, one at a time, into our storage.
      if (result.images.length && host.importImage) {
        let failed = 0;
        for (const image of result.images) {
          try {
            const stored = await host.importImage(image.src);
            const media = {
              key: stored.key,
              ...(stored.width ? { width: stored.width } : {}),
              ...(stored.height ? { height: stored.height } : {}),
            };
            store
              .getState()
              .updateNode(
                image.nodeId,
                { props: { [image.field]: media } },
                w.title,
                `import:${image.nodeId}`,
              );
          } catch {
            failed += 1;
          }
        }
        host.toast(
          failed ? 'error' : 'success',
          failed ? w.imagesFailed(failed) : w.imagesDone(result.images.length),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerPanel
        side="right"
        closeLabel={w.cancel}
        className="sm:w-[min(40rem,calc(100vw-2rem))]"
      >
        <OverlayHeader className="border-border border-b px-5 py-4">
          <OverlayTitle>{w.title}</OverlayTitle>
          <OverlayDescription>{w.body}</OverlayDescription>
        </OverlayHeader>
        <OverlayBody className="bld-panel flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <SegmentedControl
            aria-label={w.mode}
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'replace', label: w.replace },
              { value: 'append', label: w.append },
            ]}
            className="w-full [&>*]:flex-1"
          />
          <Textarea
            value={html}
            onChange={(event) => {
              setHtml(event.target.value);
            }}
            placeholder="<!DOCTYPE html>…"
            spellCheck={false}
            className="min-h-72 flex-1 font-mono text-xs"
          />
          <input
            ref={file}
            type="file"
            accept=".html,.htm,text/html"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const picked = event.target.files?.[0];
              event.target.value = '';
              if (picked) void picked.text().then(setHtml);
            }}
          />
          <p className="text-muted-foreground text-xs">{w.hint}</p>
        </OverlayBody>
        <OverlayFooter>
          <Button
            type="button"
            variant="secondary"
            className={barButtonClass}
            icon={<Upload aria-hidden="true" />}
            onClick={() => file.current?.click()}
          >
            {w.chooseFile}
          </Button>
          <Button
            type="button"
            loading={busy}
            disabled={!html.trim()}
            className={barButtonClass}
            icon={<FileCode2 aria-hidden="true" />}
            onClick={() => void run()}
          >
            {w.import}
          </Button>
        </OverlayFooter>
      </DrawerPanel>
    </Overlay>
  );
}
