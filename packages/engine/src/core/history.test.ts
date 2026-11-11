import { describe, expect, it } from 'vitest';

import { createDocument } from './document';
import { createStandardRegistry } from './elements';
import { History } from './history';
import { BuilderError, createFragment, insert, remove, update } from './operations';
import { rt } from './rich-text';

const registry = createStandardRegistry();

function setup(now = () => 0) {
  const history = new History(createDocument({ title: 'T' }), { ids: [] }, { now });
  const add = (type: string) =>
    history.commit(
      (draft) => insert(draft, registry, draft.root, Infinity, createFragment(registry, type)),
      { label: `Add ${type}` },
    )[0] ?? '';
  return { history, add };
}

const rootChildren = (history: History) => history.doc.nodes.root?.children ?? [];

describe('History', () => {
  it('undoes and redoes a step, with its label', () => {
    const { history, add } = setup();
    add('paragraph');
    expect(history.undoLabel).toBe('Add paragraph');
    history.undo();
    expect(rootChildren(history)).toEqual([]);
    expect(history.redoLabel).toBe('Add paragraph');
    history.redo();
    expect(rootChildren(history)).toHaveLength(1);
  });

  it('merges typing in one node into one step, but not across a pause', () => {
    let clock = 0;
    const { history, add } = setup(() => clock);
    const id = add('paragraph');
    for (const text of ['H', 'He', 'Hel']) {
      clock += 200;
      history.commit(
        (draft) => {
          update(draft, registry, id, { props: { text: rt(text) } });
        },
        {
          label: 'Typing',
          coalesceKey: `text:${id}`,
        },
      );
    }
    clock += 2000;
    history.commit(
      (draft) => {
        update(draft, registry, id, { props: { text: rt('Hello') } });
      },
      {
        label: 'Typing',
        coalesceKey: `text:${id}`,
      },
    );

    history.undo();
    expect(history.doc.nodes[id]?.props.text).toEqual(rt('Hel'));
    history.undo();
    expect(history.doc.nodes[id]?.props.text).toEqual([]);
  });

  it('groups a transaction into one step', () => {
    const { history } = setup();
    history.transaction('Add two', () => {
      history.commit(
        (draft) => insert(draft, registry, draft.root, 0, createFragment(registry, 'heading')),
        { label: 'a' },
      );
      history.commit(
        (draft) => insert(draft, registry, draft.root, 1, createFragment(registry, 'paragraph')),
        { label: 'b' },
      );
    });
    expect(rootChildren(history)).toHaveLength(2);
    history.undo();
    expect(rootChildren(history)).toEqual([]);
  });

  it('rolls a failed transaction back completely', () => {
    const { history } = setup();
    expect(() => {
      history.transaction('Broken', () => {
        history.commit(
          (draft) => insert(draft, registry, draft.root, 0, createFragment(registry, 'heading')),
          { label: 'a' },
        );
        history.commit(
          (draft) => insert(draft, registry, draft.root, 0, createFragment(registry, 'column')),
          { label: 'b' },
        );
      });
    }).toThrow(BuilderError);
    expect(rootChildren(history)).toEqual([]);
    expect(history.canUndo).toBe(false);
  });

  it('restores the selection with each step', () => {
    const { history, add } = setup();
    const id = add('paragraph');
    history.select({ ids: [id] });
    history.commit((draft) => remove(draft, registry, [id]), {
      label: 'Delete',
      selectionAfter: { ids: [] },
    });
    expect(history.selected.ids).toEqual([]);
    expect(history.undo()?.selection.ids).toEqual([id]);
  });

  it('forgets redo once something new is done', () => {
    const { history, add } = setup();
    add('paragraph');
    history.undo();
    add('heading');
    expect(history.canRedo).toBe(false);
  });

  it('keeps at most `limit` steps', () => {
    const history = new History(createDocument({ title: 'T' }), { ids: [] }, { limit: 3 });
    for (let i = 0; i < 5; i += 1) {
      history.commit(
        (draft) => insert(draft, registry, draft.root, 0, createFragment(registry, 'spacer')),
        { label: String(i) },
      );
    }
    let undone = 0;
    while (history.undo()) undone += 1;
    expect(undone).toBe(3);
    expect(rootChildren(history)).toHaveLength(2);
  });
});
