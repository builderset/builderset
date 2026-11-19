import type {
  Breakpoint,
  EditableTextField,
  ElementRegistry,
  EngineDocument,
  Fragment,
  Issue,
} from '../core';
import type { ComponentType, ReactNode } from 'react';

/**
 * A starting layout the left rail's third tab offers: blocks inserted as one
 * fragment, so one undo takes it back out. `name` is per editor language.
 */
export interface TemplateSpec {
  id: string;
  name: Record<string, string>;
  blocks: { type: string; props?: Record<string, unknown> }[];
}

/**
 * What makes an editor an ARTICLE editor or an EMAIL editor.
 *
 * The workspace — top bar, panels, canvas overlay, drag and drop, undo,
 * autosave, the inspector's schema-driven fields — is the same for any
 * document built from nodes. A profile supplies the parts that are not: how
 * the canvas draws the document, what "document settings" are, which checks
 * block publishing, which block a new line of text is. The engine has no
 * default kit, so those parts are required.
 */
// #region profile
export interface EditorProfile<TDoc extends EngineDocument = EngineDocument> {
  /** Draws the document on the canvas. */
  renderCanvas: (args: {
    doc: TDoc;
    editText: (field: EditableTextField) => ReactNode;
    viewport: Breakpoint;
    /** The language being written, when it is not the base one. */
    locale?: string | undefined;
  }) => ReactNode;
  /**
   * `page`: a page with a reading measure, the profile's `canvasHeader` above
   * the blocks. `bare`: the renderer draws the whole page itself (an email's
   * backdrop). Default: `page`.
   */
  canvasFrame?: 'page' | 'bare' | undefined;
  /** Drawn above the blocks on a `page` canvas, even while it is empty: an article's title. */
  canvasHeader?: ComponentType | undefined;
  /** The widest the page gets per device. */
  canvasWidths?: Record<Breakpoint, number> | undefined;
  /** The inspector with nothing selected. Without one, it shows nothing then. */
  settingsPanel?: ComponentType | undefined;
  /** Replaces the left rail's third tab. */
  templatesPanel?: ComponentType | undefined;
  /** The starting layouts the default third tab offers, above the saved sections. */
  templates?: readonly TemplateSpec[] | undefined;
  /** What blocks publishing. */
  check: (doc: TDoc) => Issue[];
  /** Reads a stored document (the crash-safety copy); null when it is not one. */
  parse: (raw: unknown) => TDoc | null;
  /** Element categories, in library order. */
  categories: readonly string[];
  /** The block Enter and "Start writing" create. */
  paragraphType: string;
  /** Variables the text toolbar can insert (as chips). */
  variables?: readonly { path: string; label: string; group?: string | undefined }[] | undefined;
  /** The name the top bar shows. */
  titleOf: (doc: TDoc) => string;
  /** Show the Style tab (the shared per-breakpoint style model). Default: true. */
  styleTab?: boolean | undefined;
  /**
   * Called inside the same undo step after a node's props change — for rules
   * that span nodes (an email row keeping as many columns as its layout).
   */
  onNodeUpdated?: ((draft: TDoc, nodeId: string, registry: ElementRegistry) => void) | undefined;
  /**
   * Named colours offered first in colour fields — a brand palette. A value is
   * whatever the document stores (`brand.primary`); `hex` is how to show it.
   */
  colorTokens?: readonly { value: string; label: string; hex: string }[] | undefined;
  /** The fonts a `font` field offers, and a stylesheet loading them for the previews. */
  fonts?:
    | readonly {
        key: string;
        label: string;
        stack: string;
        category: string;
        web?: boolean | undefined;
      }[]
    | undefined;
  fontsPreviewUrl?: string | undefined;
  /** Extra dialogs or listeners rendered inside the editor (an email's HTML import). */
  overlays?: ComponentType | undefined;
  /** Structures the host offers as drag-and-drop fragments (email rows). */
  structures?:
    readonly { id: string; label: string; icon?: ReactNode; build: () => Fragment }[] | undefined;
}
// #endregion profile
