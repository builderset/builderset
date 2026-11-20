'use client';

import {
  defineElement,
  freeFrameSchema,
  UNPLACED_FRAME,
  z,
  type EngineDocument,
} from '@builderset/engine';
import {
  FreeArrange,
  FreeLayersPanel,
  FreeLayoutFields,
  FreeStage,
  placeNewNodes,
  useEditor,
  type EditorProfile,
  type FreeSizeOf,
  type FreeUnit,
} from '@builderset/engine/editor';

// #region element
/** A placed element: its props hold a frame, in the kit's units. */
export const sticker = defineElement({
  type: 'sticker',
  version: 1,
  category: 'shapes',
  icon: 'star',
  schema: z.object({
    frame: freeFrameSchema,
    text: z.string().max(40),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
  }),
  // No size: the editor places it when it is added (sizeOf, below).
  defaults: () => ({ frame: { ...UNPLACED_FRAME }, text: 'New', color: '#e06a1b' }),
  parents: ['root'],
});
// #endregion element

// #region stage
/** This kit counts in CSS pixels, on a board of 400 × 240. */
const PX: FreeUnit = { px: 1, label: 'px', decimals: 0, nudge: 1, bigNudge: 10, maxFit: 1.4 };
const BOARD = { width: 400, height: 240 };
const sizeOf: FreeSizeOf = () => ({ w: 120, h: 48 });

/** The artboard is the root: its children are the placed elements, the last on top. */
const useBoardId = () => useEditor<string, EngineDocument>((state) => state.doc.root);

function StickerStage() {
  const id = useBoardId();
  return (
    <FreeStage
      artboard={{ id, ...BOARD, radius: 12, background: '#ffffff' }}
      unit={PX}
      sizeOf={sizeOf}
      guides
      // One box of w × px by h × px CSS pixels: draw the element at natural size.
      renderElement={(node) => (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            height: '100%',
            borderRadius: 8,
            background: String(node.props.color),
            color: '#ffffff',
          }}
        >
          {String(node.props.text)}
        </div>
      )}
    />
  );
}

function StickerLayers() {
  return <FreeLayersPanel artboardId={useBoardId()} />;
}

function StickerArrange({ ids }: { ids: readonly string[] }) {
  const id = useBoardId();
  return <FreeArrange ids={ids} artboard={{ id, ...BOARD }} decimals={PX.decimals} />;
}
// #endregion stage

// #region profile
/** The free canvas's part of an EditorProfile; the rest is any kit's. */
export const freeCanvas = {
  stage: StickerStage,
  layersPanel: StickerLayers,
  canvasFrame: 'none',
  // One element selected: its place, size, rotation, lock and name.
  nodePanel: ({ id }) => <FreeLayoutFields id={id} unit={PX} />,
  // Several selected: align them, spread them.
  selectionPanel: ({ ids }) => <StickerArrange ids={ids} />,
  // Inserted, dropped, pasted or duplicated: give the new ones a frame.
  onNodesAdded: (draft, ids) => {
    placeNewNodes(draft, ids, { id: draft.root, ...BOARD }, sizeOf, { decimals: PX.decimals });
  },
} satisfies Partial<EditorProfile>;
// #endregion profile
