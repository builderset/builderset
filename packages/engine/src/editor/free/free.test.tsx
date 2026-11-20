import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  defineElement,
  ElementRegistry,
  frameOf,
  freeFrameSchema,
  rt,
  UNPLACED_FRAME,
  type BuilderNode,
  type EngineDocument,
  type FreeFrame,
} from '../../core';
import { createMemoryHost } from '../../host';
import { en } from '../../locales/en';
import { EditorProvider } from '../context';
import { TooltipProvider } from '../ui';
import type { EditorProfile } from '../profile';
import { createEditorStore, type EditorStore } from '../store';
import { FreeArrange, FreeLayoutFields } from './arrange';
import { FreeLayersPanel } from './layers';
import { alignNodes, distributeNodes, placeNewNodes } from './operations';
import { FreeStage } from './stage';
import type { FreeUnit } from './types';

/**
 * A tiny kit on the free canvas: a page holding one board, the board holding
 * boxes and notes, each with a frame. Millimetres, like a card.
 */
const elementProps = z.object({ frame: freeFrameSchema, text: z.string().optional() });
const registry = new ElementRegistry([
  defineElement({
    type: 'page',
    version: 1,
    category: 'layout',
    icon: 'square',
    internal: true,
    schema: z.object({}),
    defaults: () => ({}),
    container: { only: ['board'] },
  }),
  defineElement({
    type: 'board',
    version: 1,
    category: 'layout',
    icon: 'square',
    internal: true,
    schema: z.object({}),
    defaults: () => ({}),
    container: { only: ['box', 'note'] },
  }),
  defineElement({
    type: 'box',
    version: 1,
    category: 'shapes',
    icon: 'square',
    schema: elementProps,
    defaults: () => ({ frame: { ...UNPLACED_FRAME } }),
  }),
  defineElement({
    type: 'note',
    version: 1,
    category: 'text',
    icon: 'type',
    schema: elementProps,
    defaults: () => ({ frame: { ...UNPLACED_FRAME }, text: 'Note' }),
  }),
] as never[]);

const BOARD = { id: 'board', width: 85.6, height: 53.98 };
const MM: FreeUnit = { px: 6, label: 'mm', decimals: 2, nudge: 0.5, bigNudge: 5 };
const sizeOf = (type: string) => (type === 'note' ? { w: 30, h: 8 } : { w: 20, h: 10 });

function node(id: string, type: string, frame: FreeFrame, extra: Partial<BuilderNode> = {}) {
  return { id, type, v: 1, props: { frame }, ...extra } satisfies BuilderNode;
}

function makeDoc(children: BuilderNode[]): EngineDocument {
  const nodes: Record<string, BuilderNode> = {
    root: { id: 'root', type: 'page', v: 1, props: {}, children: ['board'] },
    board: { id: 'board', type: 'board', v: 1, props: {}, children: children.map((n) => n.id) },
  };
  for (const child of children) nodes[child.id] = child;
  return { schema: 'test/document', version: 1, root: 'root', meta: {}, nodes };
}

const threeBoxes = () =>
  makeDoc([
    node('a', 'box', { x: 0, y: 0, w: 10, h: 10, r: 0 }),
    node('b', 'box', { x: 30, y: 5, w: 10, h: 10, r: 0 }),
    node('c', 'note', { x: 60, y: 20, w: 20, h: 10, r: 0 }, { name: 'Title' }),
  ]);

const profile: EditorProfile = {
  renderCanvas: () => null,
  check: () => [],
  parse: () => null,
  categories: ['shapes', 'text'],
  paragraphType: 'note',
  titleOf: () => 'Test',
  onNodesAdded: (draft, ids) => {
    placeNewNodes(draft, ids, BOARD, sizeOf);
  },
  defaultParent: () => 'board',
};

function mount(doc: EngineDocument, ui: React.ReactNode) {
  const store: EditorStore = createEditorStore({
    document: doc,
    registry,
    onNodesAdded: profile.onNodesAdded,
    defaultParent: profile.defaultParent,
  });
  const value = {
    store,
    registry,
    host: createMemoryHost({ toast: vi.fn() }),
    messages: en,
    locale: 'en',
    contentLocales: ['en'],
    defaultContentLocale: 'en',
    record: { status: 'draft', scheduledAt: null, publishedAt: null },
    setRecord: () => undefined,
    profile,
  };
  const view = render(
    <EditorProvider value={value}>
      <TooltipProvider>{ui}</TooltipProvider>
    </EditorProvider>,
  );
  return { store, ...view };
}

const frame = (store: EditorStore, id: string) => frameOf(store.getState().doc.nodes[id]);

const textOf = (n: BuilderNode) => (typeof n.props.text === 'string' ? n.props.text : '');

function Stage() {
  return (
    <FreeStage
      artboard={{ ...BOARD, radius: 3.18 }}
      unit={MM}
      sizeOf={sizeOf}
      guides
      editable={(n) => n.type === 'note'}
      renderElement={(n, { editing, editText }) =>
        n.type === 'note' ? (
          <p>
            {editing ? editText({ nodeId: n.id, path: 'text', value: rt(textOf(n)) }) : textOf(n)}
          </p>
        ) : (
          <div data-testid={`box-${n.id}`} />
        )
      }
    />
  );
}

describe('the frame operations', () => {
  it('aligns one element to the board, several to each other', () => {
    const { store } = mount(threeBoxes(), null);
    store.getState().updateDocument('Align', (draft) => {
      alignNodes(draft, ['c'], 'right', BOARD);
    });
    expect(frame(store, 'c').x).toBeCloseTo(65.6);
    store.getState().updateDocument('Align', (draft) => {
      alignNodes(draft, ['a', 'b'], 'bottom', BOARD);
    });
    expect(frame(store, 'a').y).toBe(5);
    expect(frame(store, 'b').y).toBe(5);
    store.getState().updateDocument('Align', (draft) => {
      alignNodes(draft, ['a', 'b', 'c'], 'hcenter', BOARD);
    });
    // Centred in the box around all three (0 … 80, as c was moved to 65.6 … 85.6).
    expect(frame(store, 'a').x).toBeCloseTo((85.6 - 10) / 2);
  });

  it('leaves a locked element where it is', () => {
    const doc = threeBoxes();
    const b = doc.nodes.b;
    if (b) b.locked = true;
    const { store } = mount(doc, null);
    store.getState().updateDocument('Align', (draft) => {
      alignNodes(draft, ['a', 'b'], 'top', BOARD);
    });
    expect(frame(store, 'b').y).toBe(5);
  });

  it('spreads three or more with equal gaps, the ends staying', () => {
    const doc = makeDoc([
      node('a', 'box', { x: 0, y: 0, w: 10, h: 10, r: 0 }),
      node('b', 'box', { x: 12, y: 0, w: 10, h: 10, r: 0 }),
      node('c', 'box', { x: 50, y: 0, w: 10, h: 10, r: 0 }),
    ]);
    const { store } = mount(doc, null);
    store.getState().updateDocument('Spread', (draft) => {
      distributeNodes(draft, ['c', 'a', 'b'], 'x');
    });
    expect(frame(store, 'a').x).toBe(0);
    expect(frame(store, 'b').x).toBe(25);
    expect(frame(store, 'c').x).toBe(50);
  });

  it('places a new element in the middle, and a second one beside it', () => {
    const { store } = mount(makeDoc([]), null);
    const first = store.getState().insertElement('box');
    const second = store.getState().insertElement('box', { parentId: 'board', index: 1 });
    if (!first || !second) throw new Error('not inserted');
    expect(frame(store, first)).toEqual({ x: 32.8, y: 21.99, w: 20, h: 10, r: 0 });
    const next = frame(store, second);
    expect(next.x).toBeGreaterThan(32.8);
    expect(next.y).toBeGreaterThan(21.99);
  });

  it('keeps a frame the new element came with, and offsets a duplicate', () => {
    const { store } = mount(makeDoc([]), null);
    const id = store
      .getState()
      .insertElement('note', undefined, { frame: { x: 4, y: 4, w: 30, h: 8, r: 0 } });
    if (!id) throw new Error('not inserted');
    expect(frame(store, id)).toEqual({ x: 4, y: 4, w: 30, h: 8, r: 0 });
    const [copy] = store.getState().duplicateNodes([id]);
    if (!copy) throw new Error('not duplicated');
    expect(frame(store, copy).x).toBeCloseTo(4 + 85.6 / 40);
  });

  it('uses a fixed place when the kit gives one', () => {
    const { store } = mount(makeDoc([]), null);
    store.getState().updateDocument('Add', (draft) => {
      const board = draft.nodes.board;
      draft.nodes.chip = node('chip', 'box', { ...UNPLACED_FRAME });
      board?.children?.push('chip');
      placeNewNodes(draft, ['chip'], BOARD, () => ({ w: 11, h: 9, x: 10.25, y: 19.23 }));
    });
    expect(frame(store, 'chip')).toEqual({ x: 10.25, y: 19.23, w: 11, h: 9, r: 0 });
  });
});

describe('<FreeStage>', () => {
  it('is a labelled region with its elements as options', () => {
    mount(threeBoxes(), <Stage />);
    expect(screen.getByRole('region', { name: 'Canvas' })).toBeInTheDocument();
    const list = screen.getByRole('listbox', { name: 'Elements' });
    expect(within(list).getAllByRole('option')).toHaveLength(3);
    expect(within(list).getByRole('option', { name: 'Title' })).toBeInTheDocument();
  });

  it('selects an element on focus and shows its handles and size', () => {
    const { store } = mount(threeBoxes(), <Stage />);
    act(() => {
      screen.getByRole('option', { name: 'Title' }).focus();
    });
    expect(store.getState().selection).toEqual(['c']);
    expect(
      screen.getByLabelText('Resize from the top left corner', { selector: 'button' }),
    ).toBeInTheDocument();
    expect(screen.getByText('20 × 10 mm')).toBeInTheDocument();
  });

  it('nudges with the arrows, Shift ten times as far, all in one undo step', () => {
    const { store } = mount(threeBoxes(), <Stage />);
    const option = screen.getByRole('option', { name: 'Title' });
    act(() => {
      option.focus();
    });
    fireEvent.keyDown(option, { key: 'ArrowRight' });
    fireEvent.keyDown(option, { key: 'ArrowRight' });
    fireEvent.keyDown(option, { key: 'ArrowDown', shiftKey: true });
    expect(frame(store, 'c')).toMatchObject({ x: 61, y: 25 });
    expect(screen.getByRole('status')).toHaveTextContent('Moved to X 61 mm, Y 25 mm');
    act(() => {
      store.getState().undo();
    });
    expect(frame(store, 'c')).toMatchObject({ x: 60, y: 20 });
    expect(store.getState().canUndo).toBe(false);
  });

  it('does not nudge a locked element, and lets go with Escape', () => {
    const doc = threeBoxes();
    const c = doc.nodes.c;
    if (c) c.locked = true;
    const { store } = mount(doc, <Stage />);
    const option = screen.getByRole('option', { name: 'Title' });
    act(() => {
      option.focus();
    });
    fireEvent.keyDown(option, { key: 'ArrowLeft' });
    expect(frame(store, 'c').x).toBe(60);
    fireEvent.keyDown(option, { key: 'Escape' });
    expect(store.getState().selection).toEqual([]);
  });

  it('edits text with Enter, only where the kit allows it', () => {
    const { store } = mount(threeBoxes(), <Stage />);
    const box = screen.getAllByRole('option')[0];
    if (!box) throw new Error('no option');
    act(() => {
      box.focus();
    });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(store.getState().editingId).toBeNull();
    const note = screen.getByRole('option', { name: 'Title' });
    act(() => {
      note.focus();
    });
    fireEvent.keyDown(note, { key: 'Enter' });
    expect(store.getState().editingId).toBe('c');
  });

  it('selects everything visible and unlocked with Ctrl A', () => {
    const doc = threeBoxes();
    const a = doc.nodes.a;
    if (a) a.hidden = true;
    const { store } = mount(doc, <Stage />);
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true });
    expect(store.getState().selection).toEqual(['b', 'c']);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('moves a dragged element in one undo step', () => {
    const { store } = mount(threeBoxes(), <Stage />);
    const option = screen.getByRole('option', { name: 'Title' });
    // jsdom has no layout: the stage's origin is at 0,0 and k = 6 px per mm.
    fireEvent.pointerDown(option, { button: 0, clientX: 400, clientY: 150 });
    fireEvent.pointerMove(window, { clientX: 412, clientY: 162, altKey: true });
    fireEvent.pointerMove(window, { clientX: 424, clientY: 174, altKey: true });
    fireEvent.pointerUp(window);
    expect(frame(store, 'c')).toMatchObject({ x: 64, y: 24 });
    act(() => {
      store.getState().undo();
    });
    expect(frame(store, 'c')).toMatchObject({ x: 60, y: 20 });
  });
});

describe('<FreeLayersPanel>', () => {
  it('lists the topmost first, with names and previews', () => {
    mount(threeBoxes(), <FreeLayersPanel artboardId="board" />);
    const rows = screen.getAllByRole('treeitem');
    expect(rows.map((row) => row.dataset.freeLayer)).toEqual(['c', 'b', 'a']);
    expect(screen.getByText('3 layers')).toBeInTheDocument();
  });

  it('hides and locks from a row', async () => {
    const user = userEvent.setup();
    const { store } = mount(threeBoxes(), <FreeLayersPanel artboardId="board" />);
    const row = screen.getAllByRole('treeitem')[0];
    if (!row) throw new Error('no row');
    await user.click(within(row).getByRole('button', { name: 'Hide' }));
    expect(store.getState().doc.nodes.c?.hidden).toBe(true);
    await user.click(within(row).getByRole('button', { name: 'Lock' }));
    expect(store.getState().doc.nodes.c?.locked).toBe(true);
  });

  it('renames with a double-click', async () => {
    const user = userEvent.setup();
    const { store } = mount(threeBoxes(), <FreeLayersPanel artboardId="board" />);
    const row = screen.getAllByRole('treeitem')[2];
    if (!row) throw new Error('no row');
    await user.dblClick(row);
    const input = screen.getByRole('textbox', { name: 'Rename' });
    await user.type(input, 'Back plate{Enter}');
    expect(store.getState().doc.nodes.a?.name).toBe('Back plate');
  });

  it('restacks with Alt and the arrows, up meaning on top', () => {
    const { store } = mount(
      threeBoxes(),
      <>
        <Stage />
        <FreeLayersPanel artboardId="board" />
      </>,
    );
    act(() => {
      store.getState().select(['a']);
    });
    const row = screen.getAllByRole('treeitem')[2];
    if (!row) throw new Error('no row');
    fireEvent.keyDown(row, { key: 'ArrowUp', altKey: true });
    expect(store.getState().doc.nodes.board?.children).toEqual(['b', 'a', 'c']);
  });

  it('restacks by dragging a row', () => {
    const { store } = mount(threeBoxes(), <FreeLayersPanel artboardId="board" />);
    const rows = screen.getAllByRole('treeitem');
    const [top, , bottom] = rows;
    if (!top || !bottom) throw new Error('no rows');
    // Rows are 34px tall in the panel; jsdom has no layout, so give them one.
    rows.forEach((row, index) => {
      row.getBoundingClientRect = () =>
        ({ top: index * 34, height: 34, bottom: index * 34 + 34 }) as DOMRect;
    });
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
      setDragImage: () => undefined,
      effectAllowed: 'move',
      dropEffect: 'move',
    };
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    // Drag the bottom row (a) above the top one: it goes on top.
    fireEvent.dragStart(bottom, { dataTransfer });
    const list = screen.getByRole('tree');
    // jsdom's drag events carry no coordinates: give them one.
    const at = (event: Event) => {
      Object.defineProperty(event, 'clientY', { value: 5 });
      return event;
    };
    fireEvent(list, at(createEvent.dragOver(list, { dataTransfer })));
    fireEvent(list, at(createEvent.drop(list, { dataTransfer })));
    expect(store.getState().doc.nodes.board?.children).toEqual(['b', 'c', 'a']);
    vi.restoreAllMocks();
  });
});

describe('<FreeArrange> and <FreeLayoutFields>', () => {
  it('aligns from the inspector as one undo step', async () => {
    const user = userEvent.setup();
    const { store } = mount(threeBoxes(), <FreeArrange ids={['a', 'b', 'c']} artboard={BOARD} />);
    expect(screen.getByText('Align to each other')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Align top' }));
    expect([frame(store, 'a').y, frame(store, 'b').y, frame(store, 'c').y]).toEqual([0, 0, 0]);
    act(() => {
      store.getState().undo();
    });
    expect(frame(store, 'c').y).toBe(20);
  });

  it('brings an element forward', async () => {
    const user = userEvent.setup();
    const { store } = mount(threeBoxes(), <FreeArrange ids={['a']} artboard={BOARD} />);
    await user.click(screen.getByRole('button', { name: 'Bring forward' }));
    expect(store.getState().doc.nodes.board?.children).toEqual(['b', 'a', 'c']);
    expect(screen.getByRole('button', { name: 'Send to back' })).toBeEnabled();
  });

  it('shows and edits the frame in the unit', async () => {
    const user = userEvent.setup();
    const { store } = mount(threeBoxes(), <FreeLayoutFields id="c" unit={MM} />);
    const width = screen.getByLabelText('Width');
    // One decimal: the stepper's step for a unit kept to hundredths.
    expect(width).toHaveValue('20.0');
    await user.clear(width);
    await user.type(width, '24.5');
    expect(frame(store, 'c').w).toBe(24.5);
  });
});
