import type {
  Breakpoint,
  BuilderDocument,
  ElementRegistry,
  Fragment,
  Issue,
} from '@motors/builder-core';
import type { EditableTextField } from '@motors/builder-render';
import type { ComponentType, ReactNode } from 'react';

/**
 * What makes an editor an ARTICLE editor or an EMAIL editor.
 *
 * The workspace — top bar, panels, canvas overlay, drag and drop, undo,
 * autosave, the inspector's schema-driven fields — is the same for any
 * document built from nodes. A profile supplies the parts that are not: how
 * the canvas draws the document, what "document settings" are, which checks
 * block publishing, which block a new line of text is. Everything is optional;
 * an empty profile is the article builder.
 */
export interface EditorProfile {
  /** Draws the document on the canvas. Default: the article renderer. */
  renderCanvas?:
    | ((args: {
        doc: BuilderDocument;
        editText: (field: EditableTextField) => ReactNode;
        viewport: Breakpoint;
      }) => ReactNode)
    | undefined;
  /**
   * `article`: a white page with a reading measure and the title field.
   * `bare`: the renderer draws the whole page itself (an email's backdrop).
   */
  canvasFrame?: 'article' | 'bare' | undefined;
  /** The widest the page gets per device. */
  canvasWidths?: Record<Breakpoint, number> | undefined;
  /** Replaces the inspector's "document settings" (shown with nothing selected). */
  settingsPanel?: ComponentType | undefined;
  /** Replaces the left rail's third tab. */
  templatesPanel?: ComponentType | undefined;
  /** What blocks publishing. Default: `checkDocument`. */
  check?: ((doc: BuilderDocument) => Issue[]) | undefined;
  /** Reads a stored document (the crash-safety copy). Default: `parseDocument`. */
  parse?: ((raw: unknown) => BuilderDocument | null) | undefined;
  /** Element categories, in library order. */
  categories?: readonly string[] | undefined;
  /** The block Enter and "Start writing" create. Default: `paragraph`. */
  paragraphType?: string | undefined;
  /** Variables the text toolbar can insert (as chips). */
  variables?: readonly { path: string; label: string; group?: string | undefined }[] | undefined;
  /** The name the top bar shows. Default: `meta.title`. */
  titleOf?: ((doc: BuilderDocument) => string) | undefined;
  /** Show the Style tab (the shared per-breakpoint style model). Default: true. */
  styleTab?: boolean | undefined;
  /**
   * Called inside the same undo step after a node's props change — for rules
   * that span nodes (an email row keeping as many columns as its layout).
   */
  onNodeUpdated?:
    ((draft: BuilderDocument, nodeId: string, registry: ElementRegistry) => void) | undefined;
  /**
   * Named colours offered first in colour fields — a brand palette. A value is
   * whatever the document stores (`brand.primary`); `hex` is how to show it.
   */
  colorTokens?: readonly { value: string; label: string; hex: string }[] | undefined;
  /** Structures the host offers as drag-and-drop fragments (email rows). */
  structures?:
    readonly { id: string; label: string; icon?: ReactNode; build: () => Fragment }[] | undefined;
}
