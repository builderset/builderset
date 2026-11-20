import type { BuilderNode, EditableTextField, NodeId } from '../../core';
import type { ReactNode } from 'react';

/**
 * The free canvas's shapes: what a kit whose elements sit at their own x and y
 * (a card, a popup) hands the engine, and what the engine hands back.
 *
 * Everything is in the KIT's units — a card's millimetres, a popup's CSS
 * pixels. The stage turns units into screen pixels; the document never holds a
 * screen pixel. The frame itself (`FreeFrame`, `freeFrameSchema`, `frameOf`)
 * is data, so it lives in the core.
 */

export type { FreeFrame, FreeRect } from '../../core';

/** How the kit counts: millimetres for a card, pixels for a popup. */
export interface FreeUnit {
  /**
   * CSS pixels per unit at 100 % — the artboard's natural size. The stage
   * fits the artboard to the room it has (never larger than `px × maxFit`),
   * and the editor's zoom multiplies that.
   */
  px: number;
  /** What follows a number: `'mm'`, `'px'`. */
  label: string;
  /** Decimals kept in the document and shown: 2 for millimetres, 0 for pixels. */
  decimals: number;
  /** An arrow key's step, units. */
  nudge: number;
  /** Shift + arrow's step, units. */
  bigNudge: number;
  /** The smallest width or height a resize leaves, units. Default: `nudge`. */
  minSize?: number | undefined;
  /** How far the fit may ENLARGE the artboard over `px`. Default: 1 (never larger than natural). */
  maxFit?: number | undefined;
}

/** The surface elements are placed on: a card's side, a popup's box. */
export interface FreeArtboard {
  /** The container whose children are the placed elements, in stacking order (last = on top). */
  id: NodeId;
  /** Units. */
  width: number;
  height: number;
  /** The artboard's corners, units. */
  radius?: number | undefined;
  /** CSS background of the artboard (a colour, a gradient, `url(…) center / cover`). It fills the bleed too. */
  background?: string | undefined;
  /** Room drawn around the artboard (a card's bleed), units. Elements may extend into it. */
  bleed?: number | undefined;
  /**
   * Drawn under / over the elements, never catching the pointer. Inside, the
   * origin is the artboard's top-left corner and one unit is `unit.px` CSS
   * pixels (the stage scales the whole artboard with CSS `zoom`); the
   * artboard also carries `--bld-free-u: <px>px`, so CSS can say
   * `calc(var(--bld-free-u) * 3.18)`. A bleed mask, a safe area, an ISO chip zone.
   */
  underlay?: ReactNode;
  overlay?: ReactNode;
  /** Extra lines elements snap to (a safe area), units. Edges and centre always snap. */
  snapX?: readonly number[] | undefined;
  snapY?: readonly number[] | undefined;
  /** CSS box-shadow of the artboard (a popup's shadow). */
  shadow?: string | undefined;
  /** Extra class on the artboard (the kit's own `.bsc-…`). */
  className?: string | undefined;
}

/** What `renderElement` is told about the element it draws. */
export interface FreeRenderArgs {
  /** Its text is being typed into: draw the fields through `editText`. */
  editing: boolean;
  selected: boolean;
  /**
   * The engine's inline text editor for one rich-text field. Call it while
   * `editing`; outside editing it draws the field's plain text, so a kit may
   * call it always if it has no reading view of its own.
   */
  editText: (field: EditableTextField) => ReactNode;
  /** CSS pixels per unit inside the artboard (= `unit.px`). */
  px: number;
}

/** A new element's size, and optionally a fixed place (a chip at its ISO spot). Units. */
export interface FreeSize {
  w: number;
  h: number;
  /** When set, a drop or a click puts the element exactly here, not at the pointer or the centre. */
  x?: number | undefined;
  y?: number | undefined;
}

export type FreeSizeOf = (type: string, props?: Record<string, unknown>) => FreeSize;

export interface FreeStageProps {
  artboard: FreeArtboard;
  unit: FreeUnit;
  /** The element's content, filling its frame (a box of `w × px` by `h × px` CSS pixels). */
  renderElement: (node: BuilderNode, args: FreeRenderArgs) => ReactNode;
  /** Double-click or Enter starts editing its text (sets the store's `editingId`). Default: never. */
  editable?: ((node: BuilderNode) => boolean) | undefined;
  /** Resizing keeps its proportions without Shift (a QR code, a photo). Default: never. */
  keepRatio?: ((node: BuilderNode) => boolean) | undefined;
  /** A new element's size when dropped from the library. */
  sizeOf: FreeSizeOf;
  /** Draw the pink snap guides while moving, and snap to `snapX`/`snapY`. Edges, centre and other elements always snap. */
  guides: boolean;
  /** Above / below the artboard: "Front · working view, not to scale" / "Flip to back · F". */
  caption?: ReactNode;
  footer?: ReactNode;
  /** The stage region's accessible name. Default: the editor's `free.stage` word. */
  label?: string | undefined;
  /** How close, in SCREEN pixels, an edge must come to a line to snap to it. Default: 6. */
  snapThreshold?: number | undefined;
}

/** The six alignments: three across, three down. */
export type FreeAlign = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

/** A resize handle: corners and edges, by compass point. */
export type FreeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** What `placeNewNodes`, `alignNodes`… need to know about the artboard. */
export interface FreeBoard {
  id: NodeId;
  width: number;
  height: number;
}
