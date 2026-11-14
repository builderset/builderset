'use client';

import type { MediaKind, MediaRef } from '../../core';
import { Button, Progress } from '../ui';
import { FileText, ImageUp, Music, RefreshCw, Trash2, Video, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { useEditorContext } from '../context';

const ACCEPT: Record<MediaKind, string> = {
  image: 'image/jpeg,image/png,image/webp,image/avif',
  video: 'video/mp4,video/webm',
  audio: 'audio/mpeg,audio/mp4,audio/ogg,audio/wav',
  file: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip',
};

/**
 * A piece of media by key: a preview, and upload / replace / clear.
 *
 * The upload goes through the host, which returns a KEY; the key is all the
 * document stores. Cancelling an upload aborts the transfer.
 */
export function MediaField({
  value,
  onChange,
  kind = 'image',
  id,
}: {
  /** The current media, if any: an image is previewed, other kinds show their file name. */
  value: MediaRef | null | undefined;
  /** Called with the new reference once an upload finishes, or `null` when cleared. */
  onChange: (value: MediaRef | null) => void;
  /** What may be uploaded: sets the file types offered and the icon. Default: `'image'`. */
  kind?: MediaKind | undefined;
  /** The hidden file input's id, so a label can point at it. */
  id?: string | undefined;
}) {
  const { host, messages } = useEditorContext();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const upload = async (file: File) => {
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setProgress(0);
    try {
      const result = await host.upload(file, kind, setProgress, controller.signal);
      const ref: MediaRef = { key: result.key };
      if (result.width) ref.width = result.width;
      if (result.height) ref.height = result.height;
      ref.mime = result.mime ?? (file.type || undefined);
      ref.size = result.size ?? file.size;
      ref.name = (result.name ?? file.name).slice(0, 200);
      if (ref.mime === undefined) delete ref.mime;
      onChange(ref);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : messages.uploadFailed);
      }
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  const url = value ? host.resolveMedia(value.key) : '';
  const Icon =
    kind === 'video' ? Video : kind === 'audio' ? Music : kind === 'file' ? FileText : ImageUp;

  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={id}
        type="file"
        accept={ACCEPT[kind]}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      {value ? (
        <div className="border-border bg-muted/30 overflow-hidden rounded-[var(--radius-control)] border">
          {kind === 'image' && url ? (
            <img src={url} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex items-center gap-2 px-3 py-3 text-sm">
              <Icon className="text-muted-foreground size-4" aria-hidden="true" />
              <span className="truncate">{value.name ?? value.key.split('/').pop()}</span>
            </div>
          )}
        </div>
      ) : null}
      {progress !== null ? (
        <div className="flex items-center gap-2">
          <Progress value={Math.round(progress * 100)} className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={messages.cancel}
            onClick={() => abort.current?.abort()}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            icon={value ? <RefreshCw aria-hidden="true" /> : <Icon aria-hidden="true" />}
            onClick={() => input.current?.click()}
          >
            {value ? messages.replace : messages.upload}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label={messages.clear}
              onClick={() => {
                onChange(null);
              }}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      )}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
