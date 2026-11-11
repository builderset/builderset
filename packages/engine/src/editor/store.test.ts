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
    const paragraph = state().insertElement('paragraph');
    if (!paragraph) throw new Error('no paragraph');
    // Nothing can go INSIDE a paragraph, whatever is built around it.
    const result = state().insertElement('heading', { parentId: paragraph, index: 0 });
    expect(result).toBeNull();
    expect(refused).toHaveBeenCalled();
    expect(state().doc.nodes[state().doc.root]?.children).toEqual([paragraph]);
  });

  it('builds the containers a block needs', () => {
    const { state } = setup();
    // A column only lives in columns: inserting one at the root builds them.
    const column = state().insertElement('column');
    expect(column && state().doc.nodes[column]?.type).toBe('column');
    expect(state().selection).toEqual([column]);
    const root = state().doc.nodes[state().doc.root];
    const wrapper = root?.children?.[0] ? state().doc.nodes[root.children[0]] : undefined;
    expect(wrapper?.type).toBe('columns');
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

describe('writing in another language', () => {
  function translating() {
    const context = setup();
    const { state } = context;
    const heading = state().insertElement('heading', undefined, { level: 2, text: rt('Hapi') });
    const list = state().insertElement('list', undefined, {
      style: 'bullet',
      items: [{ text: rt('Një') }, { text: rt('Dy') }],
    });
    if (!heading || !list) throw new Error('not inserted');
    state().setMultilingual(true, 'sq');
    state().setLang('en');
    return { ...context, heading, list };
  }

  it('saves the words for that language and keeps the base', () => {
    const { state, heading } = translating();
    expect(state().lang).toBe('en');
    const props = state().view.nodes[heading]?.props ?? {};
    state().updateNode(heading, { props: { ...props, text: rt('Step') } }, 'Type');

    expect(state().doc.nodes[heading]?.props.text).toEqual(rt('Hapi'));
    expect(state().doc.i18n?.translations.en?.nodes?.[heading]?.text).toEqual(rt('Step'));
    expect(state().view.nodes[heading]?.props.text).toEqual(rt('Step'));

    state().setLang(null);
    expect(state().view.nodes[heading]?.props.text).toEqual(rt('Hapi'));
  });

  it('changes what is not words for every language', () => {
    const { state, heading } = translating();
    state().updateNode(heading, { props: { level: 3 } }, 'Level');
    expect(state().doc.nodes[heading]?.props.level).toBe(3);
    expect(state().doc.i18n?.translations.en?.nodes?.[heading]).toBeUndefined();
  });

  it('translates one list item by its place, and refuses adding one', () => {
    const { state, list, refused } = translating();
    const items = state().view.nodes[list]?.props.items as { text: unknown }[];
    state().updateNode(list, { props: { items: [items[0], { text: rt('Two') }] } }, 'Type');
    expect(state().doc.i18n?.translations.en?.nodes?.[list]).toEqual({ 'items.1.text': rt('Two') });

    const added = state().updateNode(
      list,
      { props: { items: [...items, { text: rt('Three') }] } },
      'Add',
    );
    expect(added).toBe(false);
    expect(refused).toHaveBeenCalledWith('i18n.structureInBase');
  });

  it('never writes the base text over a translation', () => {
    const { state, heading } = translating();
    const props = state().view.nodes[heading]?.props ?? {};
    state().updateNode(heading, { props: { ...props, text: rt('Step') } }, 'Type');
    // A caller that built its props from the base document.
    const base = state().doc.nodes[heading]?.props ?? {};
    state().updateNode(heading, { props: { ...base, level: 4 } }, 'Level');
    expect(state().doc.i18n?.translations.en?.nodes?.[heading]?.text).toEqual(rt('Step'));
    expect(state().doc.nodes[heading]?.props.level).toBe(4);
  });

  it('translates the title, undoes, and switches off', () => {
    const { state } = translating();
    state().updateMeta({ title: 'Test in English' }, 'Edit title');
    expect(state().doc.meta.title).toBe('Test');
    expect(state().view.meta.title).toBe('Test in English');
    state().undo();
    expect(state().view.meta.title).toBe('Test');

    state().setMultilingual(false, 'sq');
    expect(state().lang).toBeNull();
    expect(state().doc.i18n?.enabled).toBe(false);
  });
});
