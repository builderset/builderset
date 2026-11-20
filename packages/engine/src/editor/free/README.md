# The free canvas

For a kit whose elements are not a flow of blocks but sit at their own x and y — a card, a popup. The engine draws the artboard, the elements (through the kit's `renderElement`), the selection with its 8 handles and rotate handle, the snap guides, the marquee, the drop from the library, the layers and the arrange and layout fields. The kit supplies the document, the elements' look, and its units.

The stage is plugged in through the profile's `stage` and `layersPanel` (see `../profile.ts`). Everything below is exported from `@builderset/engine/editor`; the data part (`FreeFrame`, `freeFrameSchema`, `UNPLACED_FRAME`, `frameOf`, `frameBounds`, `isPlaced`, `normalizeAngle`) also from `@builderset/engine` (the core), for a kit's document schema and checks. The types are in [types.ts](types.ts) and [../../core/frame.ts](../../core/frame.ts).

## The document

- The **artboard** is a container node (a card's `side`, a popup's root). Its `children` are the placed elements, in stacking order: the last one is on top.
- Every placed element has `props.frame: FreeFrame` — `{ x, y, w, h, r }` in the kit's units, relative to the artboard's top-left corner (the trim, not the bleed), `r` in degrees clockwise about the centre, in [0, 360). Put `frame: freeFrameSchema` in each element's props schema, and `frame: { ...UNPLACED_FRAME }` in its defaults.
- A frame with no size (`w` or `h` 0) is **unplaced**: `placeNewNodes` (in the profile's `onNodesAdded`) gives it one.
- The node's own `hidden`, `locked` and `name` are used: hidden ones are dimmed on the stage (the renderer leaves them out), locked ones can be selected but not moved, resized, rotated or deleted (dashed box, no handles), the name is the layer's.

## Units

```ts
interface FreeUnit {
  px: number; // CSS pixels per unit at 100 % — the artboard's natural size
  label: string; // 'mm' | 'px'
  decimals: number; // kept in the document and shown: 2 for mm, 0 for px
  nudge: number; // an arrow key, units
  bigNudge: number; // Shift + arrow, units
  minSize?: number; // smallest w/h a resize leaves (default: nudge)
  maxFit?: number; // how far the fit may ENLARGE the artboard over px (default 1)
}
```

The stage fits the artboard (with its bleed) into the room it has, never larger than `px × maxFit`, and the editor's zoom (the dock's 50–150 %) multiplies the fit. Suggested: a card `{ px: 6, label: 'mm', decimals: 2, nudge: 0.5, bigNudge: 5, maxFit: 3 }`; a popup `{ px: 1, label: 'px', decimals: 0, nudge: 1, bigNudge: 10, maxFit: 1.4 }`.

**Inside the artboard, one unit is `unit.px` CSS pixels** — the stage scales the whole artboard with CSS `zoom`, so the kit draws at natural size and never thinks about zoom. An element's box is `w × px` by `h × px` CSS pixels. The artboard carries `--bld-free-u: <px>px`, so CSS can write `calc(var(--bld-free-u) * 3.18)`. The selection, handles and guides are drawn over it in screen pixels, so they keep their size at any zoom.

## `<FreeStage>`

```tsx
function CardStage() {
  const side = useEditor<CardDocument['nodes'][string] | undefined, CardDocument>(…);
  return (
    <FreeStage
      artboard={{ id: side.id, width: 85.6, height: 53.98, radius: 3.18, background: '#111827',
                  bleed: 2, snapX: [3, 82.6], snapY: [3, 50.98], underlay, overlay }}
      unit={MM}
      renderElement={(node, { editing, editText, px }) => <CardElement node={node} … />}
      editable={(node) => TEXT_TYPES.has(node.type)}
      keepRatio={(node) => node.type === 'qr'}
      sizeOf={(type) => SIZES[type]}
      guides={guides}
      caption={<span>Front · working view, not to scale</span>}
      footer={<FlipButton />}
    />
  );
}
// profile: { stage: CardStage, layersPanel: CardLayers, onNodesAdded: (draft, ids) => placeNewNodes(draft, ids, board(draft), sizeOf), … }
```

| Prop                                                       | What                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `artboard`                                                 | `FreeArtboard`: `id`, `width`, `height` (units), `radius?`, `background?` (CSS, fills the bleed too), `bleed?`, `underlay?`/`overlay?` (ReactNodes in unit space, never catch the pointer: a bleed mask, a safe area, an ISO chip zone), `snapX?`/`snapY?` (extra snap lines, units), `shadow?` (CSS box-shadow), `className?` |
| `unit`                                                     | `FreeUnit`, above                                                                                                                                                                                                                                                                                                              |
| `renderElement(node, { editing, selected, editText, px })` | The element's content, filling its frame. While `editing`, draw the text fields through `editText(field)` (the engine's inline editor); outside editing draw your renderer's reading view (`editText` then draws plain text, if you have none)                                                                                 |
| `editable?(node)`                                          | Double-click or Enter starts editing its text (the store's `editingId`). Default: never                                                                                                                                                                                                                                        |
| `keepRatio?(node)`                                         | Resizing keeps its proportions without Shift (a QR code). Default: never                                                                                                                                                                                                                                                       |
| `sizeOf(type, props?)`                                     | A new element's size `{ w, h }`, units — and optionally `x`/`y` to always put it there (a chip at its ISO spot, a full-width stripe)                                                                                                                                                                                           |
| `guides`                                                   | Draw the pink snap lines while moving, and snap to `snapX`/`snapY`. Edges, centre and other elements always snap                                                                                                                                                                                                               |
| `caption?`, `footer?`                                      | Above / below the artboard; the caption is drawn as the concept's mono pill, the footer as given                                                                                                                                                                                                                               |
| `label?`                                                   | The stage region's accessible name (default: "Canvas" in the editor's language)                                                                                                                                                                                                                                                |
| `snapThreshold?`                                           | Screen pixels (default 6)                                                                                                                                                                                                                                                                                                      |

What it does:

- **Select**: click; Shift/Ctrl/⌘-click adds or removes; drag on the empty artboard draws a **marquee** (Shift adds to the selection); click outside the artboard clears; Escape clears (or stops typing); Ctrl/⌘ A selects every visible, unlocked element of the artboard. Hovering a layer outlines its element.
- **Move**: drag (3 px before it starts). Shift keeps to one axis; Alt does not snap. Snaps the selection's left/centre/right and top/middle/bottom to the artboard's edges and centre, to `snapX`/`snapY`, and to the other visible elements', with pink guides. A floating tooltip shows "X 12.5 mm Y 4 mm".
- **Resize**: 8 square handles (also on a rotated element — the opposite corner stays put). Shift on a corner (or `keepRatio`) keeps the proportions; Alt does not snap; the moving edges snap when the element is not rotated. The tooltip shows "W × H".
- **Rotate**: the round handle above. Snaps to 0/45/90… within 4°; Shift snaps to 15° steps; Alt is free.
- The selection box carries a dimension tag below it in the unit ("53.98 × 85.6 mm", a lock for a locked one); several selected show one box with "3 selected".
- **Keyboard** (focus on the stage, an element, a layer row, or nothing): arrows nudge by `unit.nudge`, Shift × `bigNudge`; held arrows make **one** undo step. Enter or double-click edits text. Ctrl/⌘ ] / [ bring forward / send backward. Delete, Ctrl/⌘ D, undo and redo are the editor's own. Each element is focusable (Tab) and selects on focus; the stage is a labelled region with a listbox of elements; moves are announced politely.
- **Drop from the library** (the Add tab's drag, or any `setActiveDrag({ kind: 'type', type, props })`): a dashed drop box the element's size follows the pointer, snapping like a move; the element is inserted into the artboard at that frame (`props.frame` is set before `onNodesAdded`, so `placeNewNodes` leaves it).
- One drag, resize, rotate or marquee is **one undo step**: the gesture draws a preview and commits once on release through `updateDocument`. Align and spread make elements glide into place (no motion under `prefers-reduced-motion`).

## `<FreeLayersPanel>`

```tsx
<FreeLayersPanel artboardId={side.id} summary="Front · 12 layers" iconOf={(node) => <MyIcon … />} previewOf={(node) => …} />
```

The Layers tab for a free canvas: topmost first; each row has the element's icon (`iconOf`, default: the registry's `icon` through the engine's icon set), its name (`node.name`, else the element's name in the editor's words), a preview of its text (`previewOf`, default: `props.text` as plain text), and hide and lock buttons. Click selects (Shift/Ctrl adds), double-click or F2 renames, drag a row to restack (an indicator shows where it lands), Alt + ↑/↓ moves the selection a layer up/down. `summary` replaces the "12 layers" line; `hint` replaces the hint under the rows.

## `<FreeArrange>` and `<FreeLayoutFields>` — for the inspector

```tsx
<FreeArrange ids={selection} artboard={{ id, width, height }} title="Align to card" decimals={2} />
<FreeLayoutFields id={id} unit={MM} />
```

- In the profile, `nodePanel` holds one element's inspector, and `selectionPanel: ({ ids }) => <FreeArrange ids={ids} … />` puts arrange above the engine's actions on several selected.
- `FreeArrange`: the six alignments (to the artboard for one element, to each other for several), spread evenly across/down (three or more), bring forward / send backward (one element). `title?` replaces the heading.
- `FreeArrange`'s `decimals` is the unit's (default 2), so aligned frames are rounded as the kit keeps them.
- `FreeLayoutFields`: X, Y, width, height, rotation in the unit (steppers, one undo step per field while typing), locked and hidden switches, the name in layers.

## Functions over a draft (one undo step each when run inside `updateDocument`)

```ts
placeNewNodes(draft, ids, board: FreeBoard, sizeOf, options?: { step?: number }): void
alignNodes(draft, ids, align: FreeAlign, board: FreeBoard): void   // one: to the board; several: to their bounds
distributeNodes(draft, ids, axis: 'x' | 'y'): void                    // three or more, equal gaps
moveFramesBy(draft, ids, dx, dy): void
writeFrame(draft, id, frame: FreeFrame, decimals?: number): void
```

`placeNewNodes`: for each new node whose parent is `board.id` — an unplaced one gets `sizeOf(type, props)`, at its fixed `x`/`y` or centred on the board; a placed one sitting exactly on a sibling (a duplicate, a paste) moves down-right by `step` (default: the board's longer side / 40) until it is free. Locked and nodes elsewhere are left alone.

`useFreeCommands(decimals = 2)` wraps them for components: `{ setFrame(id, patch, coalesceKey?), nudge(ids, dx, dy), align(ids, align, board), distribute(ids, axis), restack(id, 'forward' | 'backward' | 'front' | 'back') }` — each one undo step (a `nudge` coalesces with the next within the history's window).

Geometry, pure and tested: `snapAxis`, `resizeFrame`, `rotateFrom`, `unionBounds`, `formatUnit(value, unit)` ("12.5 mm").

## Icons

`ElementIcon` (the library, the layers) knows these names besides the article/email/form ones: `qr-code`, `barcode`, `nfc`, `cpu`, `credit-card`, `circle`, `square`, `slash`, `image`, `star`, `tag`, `braces`, `text-cursor-input`, `x`, `timer`, `wallet`, `square-user`, `shapes`, `badge-check`, `gem`, `smartphone`, `rows-3`, `radio`, `panel-bottom`, `bell`, `cookie`, `gift`, `megaphone`, `square-mouse-pointer`. Others fall back to a box.

## Words

`messages.free.*` in the editor's locales (en, sq, de): the stage's label, handle names, the tooltips, the layers' summary and hint, the arrange and layout labels. A host overrides any through `messages`.

## Classes and attributes

For a kit's CSS or tests: the stage is `.bld-free-stage` (`data-free-scope`), the artboard `.bld-free-artboard` (`data-free-artboard=<id>`), each element `[data-free-element=<id>]` (also `data-node`; `data-hidden-node`, `data-locked`, `data-editing` when so), the layer rows `[data-free-layer=<id>]`, the handles `[data-handle=nw|…|rotate]`.
