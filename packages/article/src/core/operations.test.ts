import {
  type Fragment,
  BuilderError,
  applyChange,
  createFragment,
  duplicate,
  extractFragment,
  insert,
  move,
  remove,
  replaceType,
  unwrap,
  update,
  wrap,
  rt,
  parentOf,
  LIMITS,
} from '@motors/engine';
import { createArticleDocument, type ArticleDocument } from './document';
import { describe, expect, it } from 'vitest';

import { createArticleRegistry } from './elements';

const registry = createArticleRegistry();

/** A document built by the operations themselves, returning the ids. */
function build(types: string[]): { doc: ArticleDocument; ids: string[] } {
  let doc = createArticleDocument({ title: 'Test' });
  const ids: string[] = [];
  for (const type of types) {
    const change = applyChange(doc, (draft) =>
      insert(draft, registry, draft.root, Infinity, createFragment(registry, type)),
    );
    doc = change.doc;
    ids.push(...change.result);
  }
  return { doc, ids };
}

const childrenOfRoot = (doc: ArticleDocument) => doc.nodes[doc.root]?.children ?? [];

function refused(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof BuilderError) return error.code;
    throw error;
  }
  throw new Error('expected a BuilderError');
}

describe('insert', () => {
  it('builds a container with the children its definition starts with', () => {
    const { doc, ids } = build(['columns']);
    const columns = doc.nodes[ids[0] ?? ''];
    expect(columns?.children).toHaveLength(2);
    const firstColumn = doc.nodes[columns?.children?.[0] ?? ''];
    expect(firstColumn?.type).toBe('column');
    expect(doc.nodes[firstColumn?.children?.[0] ?? '']?.type).toBe('paragraph');
  });

  it('refuses an element where the placement rules forbid it', () => {
    const { doc } = build([]);
    expect(
      refused(() =>
        applyChange(doc, (draft) =>
          insert(draft, registry, draft.root, 0, createFragment(registry, 'column')),
        ),
      ),
    ).toBe('placement.notAllowed');
  });

  it('refuses a section inside a section', () => {
    const { doc, ids } = build(['section']);
    expect(
      refused(() =>
        applyChange(doc, (draft) =>
          insert(draft, registry, ids[0] ?? '', 0, createFragment(registry, 'section')),
        ),
      ),
    ).toBe('placement.notAllowed');
  });

  it('refuses a fifth column', () => {
    const { doc, ids } = build(['columns']);
    const columnsId = ids[0] ?? '';
    let next = doc;
    for (let i = 0; i < 2; i += 1) {
      next = applyChange(next, (draft) =>
        insert(draft, registry, columnsId, Infinity, createFragment(registry, 'column')),
      ).doc;
    }
    expect(
      refused(() =>
        applyChange(next, (draft) =>
          insert(draft, registry, columnsId, Infinity, createFragment(registry, 'column')),
        ),
      ),
    ).toBe('container.full');
  });

  it('refuses a document past the node limit', () => {
    const { doc } = build([]);
    const fragment: Fragment = { roots: [], nodes: {} };
    for (let i = 0; i < LIMITS.nodes; i += 1) {
      const one = createFragment(registry, 'paragraph');
      fragment.roots.push(...one.roots);
      Object.assign(fragment.nodes, one.nodes);
    }
    expect(
      refused(() => applyChange(doc, (draft) => insert(draft, registry, draft.root, 0, fragment))),
    ).toBe('document.tooManyNodes');
  });
});

describe('move', () => {
  it('reads the index as the drop position BEFORE the node leaves', () => {
    const { doc, ids } = build(['paragraph', 'heading', 'quote']);
    const [a, b, c] = ids;
    // Drop `a` between `b` and `c`: indicator index 2 in [a, b, c].
    const next = applyChange(doc, (draft) => move(draft, registry, [a ?? ''], draft.root, 2)).doc;
    expect(childrenOfRoot(next)).toEqual([b, a, c]);
  });

  it('moves a node into a container and out again', () => {
    const { doc, ids } = build(['section', 'paragraph']);
    const [section, paragraph] = ids;
    const inside = applyChange(doc, (draft) =>
      move(draft, registry, [paragraph ?? ''], section ?? '', 0),
    ).doc;
    expect(parentOf(inside, paragraph ?? '')?.id).toBe(section);
    const out = applyChange(inside, (draft) =>
      move(draft, registry, [paragraph ?? ''], draft.root, 0),
    ).doc;
    expect(childrenOfRoot(out)[0]).toBe(paragraph);
  });

  it('refuses moving a container into itself', () => {
    const { doc, ids } = build(['section']);
    const section = ids[0] ?? '';
    const inner = doc.nodes[section]?.children?.[0] ?? '';
    expect(
      refused(() => applyChange(doc, (draft) => move(draft, registry, [section], section, 0))),
    ).toBe('move.intoItself');
    expect(inner).toBeTruthy();
  });

  it('refuses taking a columns set below its minimum', () => {
    const { doc, ids } = build(['columns', 'columns']);
    const [left, right] = ids;
    const column = doc.nodes[left ?? '']?.children?.[0] ?? '';
    expect(
      refused(() => applyChange(doc, (draft) => move(draft, registry, [column], right ?? '', 0))),
    ).toBe('container.minimum');
  });

  it('refuses moving a locked node', () => {
    const { doc, ids } = build(['paragraph', 'heading']);
    const locked = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', { locked: true });
    }).doc;
    expect(
      refused(() =>
        applyChange(locked, (draft) => move(draft, registry, [ids[0] ?? ''], draft.root, 2)),
      ),
    ).toBe('node.locked');
  });
});

describe('remove, duplicate', () => {
  it('removes a subtree completely', () => {
    const { doc, ids } = build(['section']);
    const next = applyChange(doc, (draft) => remove(draft, registry, ids)).doc;
    expect(Object.keys(next.nodes)).toEqual(['root']);
  });

  it('places each copy right after its original, with fresh ids', () => {
    const { doc, ids } = build(['paragraph', 'section']);
    const change = applyChange(doc, (draft) => duplicate(draft, registry, ids));
    const order = childrenOfRoot(change.doc);
    expect(order).toHaveLength(4);
    expect(order[0]).toBe(ids[0]);
    expect(order[2]).toBe(ids[1]);
    expect(change.result).toEqual([order[1], order[3]]);
    expect(change.doc.nodes[order[3] ?? '']?.children?.[0]).not.toBe(
      doc.nodes[ids[1] ?? '']?.children?.[0],
    );
  });

  it('extracts a fragment that can be inserted twice', () => {
    const { doc, ids } = build(['section']);
    const one = extractFragment(doc, ids);
    const two = extractFragment(doc, ids);
    expect(one.roots[0]).not.toBe(two.roots[0]);
  });
});

describe('update', () => {
  it('merges props and checks them against the element', () => {
    const { doc, ids } = build(['heading']);
    const next = applyChange(doc, (draft) => {
      update(draft, registry, ids[0] ?? '', { props: { level: 3 } });
    }).doc;
    expect(next.nodes[ids[0] ?? '']?.props.level).toBe(3);
    expect(
      refused(() =>
        applyChange(doc, (draft) => {
          update(draft, registry, ids[0] ?? '', { props: { level: 1 } });
        }),
      ),
    ).toBe('props.invalid');
  });

  it('refuses an unsafe link inside rich text', () => {
    const { doc, ids } = build(['paragraph']);
    expect(
      refused(() =>
        applyChange(doc, (draft) => {
          update(draft, registry, ids[0] ?? '', {
            props: {
              text: [{ text: 'x', marks: [{ type: 'link', href: 'javascript:alert(1)' }] }],
            },
          });
        }),
      ),
    ).toBe('props.invalid');
  });

  it('lets a locked node be unlocked, and nothing else', () => {
    const { doc, ids } = build(['paragraph']);
    const id = ids[0] ?? '';
    const locked = applyChange(doc, (draft) => {
      update(draft, registry, id, { locked: true });
    }).doc;
    expect(
      refused(() =>
        applyChange(locked, (draft) => {
          update(draft, registry, id, { name: 'Intro' });
        }),
      ),
    ).toBe('node.locked');
    const unlocked = applyChange(locked, (draft) => {
      update(draft, registry, id, { locked: false });
    }).doc;
    expect(unlocked.nodes[id]?.locked).toBeUndefined();
  });
});

describe('wrap, unwrap, replaceType', () => {
  it('wraps siblings in a container where the first one was, and unwraps them back', () => {
    const { doc, ids } = build(['heading', 'paragraph', 'quote']);
    const wrapped = applyChange(doc, (draft) =>
      wrap(draft, registry, [ids[1] ?? '', ids[2] ?? ''], 'group'),
    );
    const group = wrapped.result;
    expect(childrenOfRoot(wrapped.doc)).toEqual([ids[0], group]);
    expect(wrapped.doc.nodes[group]?.children).toEqual([ids[1], ids[2]]);

    const back = applyChange(wrapped.doc, (draft) => unwrap(draft, registry, group)).doc;
    expect(childrenOfRoot(back)).toEqual(ids);
    expect(back.nodes[group]).toBeUndefined();
  });

  it('turns a paragraph into a heading keeping its words', () => {
    const built = build(['paragraph']);
    const id = built.ids[0] ?? '';
    const doc = applyChange(built.doc, (draft) => {
      update(draft, registry, id, { props: { text: rt('Hello') } });
    }).doc;
    const next = applyChange(doc, (draft) => {
      replaceType(draft, registry, id, 'heading');
    }).doc;
    expect(next.nodes[id]?.type).toBe('heading');
    expect(next.nodes[id]?.props.text).toEqual(rt('Hello'));
  });

  it('refuses turning an image into a paragraph', () => {
    const { doc, ids } = build(['image']);
    expect(
      refused(() =>
        applyChange(doc, (draft) => {
          replaceType(draft, registry, ids[0] ?? '', 'paragraph');
        }),
      ),
    ).toBe('replace.notCompatible');
  });
});

describe('a refused operation', () => {
  it('leaves the document exactly as it was', () => {
    const { doc } = build(['paragraph']);
    const before = JSON.stringify(doc);
    refused(() =>
      applyChange(doc, (draft) =>
        insert(draft, registry, draft.root, 0, createFragment(registry, 'column')),
      ),
    );
    expect(JSON.stringify(doc)).toBe(before);
  });
});
