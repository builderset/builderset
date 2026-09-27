import { createDocument, createStandardRegistry, rt } from '@motors/builder-core';
import { describe, expect, it, vi } from 'vitest';

import { createEditorStore } from './store';

const registry = createStandardRegistry();

function setup() {
  const refused = vi.fn();
  const store = createEditorStore({
    document: createDocument({ title: 'Test' }),
    registry,
    onRefused: refused,
  });
  return { store, refused, state: () => store.getState() };
}

describe('the editor store', () => {
  it('inserts, selects the new block, and undoes as one step', () => {
    const { state } = setup();
    const id = state().insertElement('paragraph');
    expect(id).toBeTruthy();
    expect(state().selection).toEqual([id]);
    expect(state().doc.nodes[state().doc.root]?.children).toEqual([id]);
    expect(state().canUndo).toBe(true);
    expect(state().revision).toBe(1);

    state().undo();
    expect(state().doc.nodes[state().doc.root]?.children).toEqual([]);
    state().redo();
    expect(state().doc.nodes[state().doc.root]?.children).toEqual([id]);
  });

  it('inserts after the selection, or into a selected container', () => {
    const { state } = setup();
    const first = state().insertElement('paragraph');
    const second = state().insertElement('heading');
    const root = () => state().doc.nodes[state().doc.root]?.children ?? [];
    expect(root()).toEqual([first, second]);

    const section = state().insertElement('section');
    if (!section) throw new Error('no section');
    state().select([section]);
    const inside = state().insertElement('paragraph');
    expect(state().doc.nodes[section]?.children).toContain(inside);
  });

  it('coalesces typing into one undo step', () => {
    const { state } = setup();
    const id = state().insertElement('paragraph');
    if (!id) throw new Error('no paragraph');
    state().updateNode(id, { props: { text: rt('H') } }, 'Type', `text:${id}`);
    state().updateNode(id, { props: { text: rt('He') } }, 'Type', `text:${id}`);
    state().updateNode(id, { props: { text: rt('Hey') } }, 'Type', `text:${id}`);
    state().undo();
    expect(state().doc.nodes[id]?.props.text).toEqual([]);
  });

  it('reports a refused placement instead of throwing', () => {
    const { state, refused } = setup();
    const result = state().insertElement('column');
    expect(result).toBeNull();
    expect(refused).toHaveBeenCalled();
    expect(state().doc.nodes[state().doc.root]?.children).toEqual([]);
  });

  it('moves, duplicates and deletes, keeping a sensible selection', () => {
    const { state } = setup();
    const a = state().insertElement('paragraph');
    const b = state().insertElement('paragraph');
    if (!a || !b) throw new Error('no paragraphs');
    expect(state().moveBy(b, -1)).toBe(true);
    expect(state().doc.nodes[state().doc.root]?.children).toEqual([b, a]);

    const [copy] = state().duplicateNodes([a]);
    expect(state().doc.nodes[state().doc.root]?.children).toEqual([b, a, copy]);

    state().removeNodes([a]);
    expect(state().doc.nodes[state().doc.root]?.children).toEqual([b, copy]);
    expect(state().selection).toEqual([copy]);
  });

  it('tracks unsaved work against the saved revision', () => {
    const { state } = setup();
    state().insertElement('paragraph');
    expect(state().revision).not.toBe(state().savedRevision);
    state().markSaved(state().revision);
    expect(state().revision).toBe(state().savedRevision);
    state().touch();
    expect(state().revision).not.toBe(state().savedRevision);
  });

  it('edits the document meta as undoable steps', () => {
    const { state } = setup();
    state().updateMeta({ title: 'New title' }, 'Edit title');
    expect(state().doc.meta.title).toBe('New title');
    state().undo();
    expect(state().doc.meta.title).toBe('Test');
  });
});
