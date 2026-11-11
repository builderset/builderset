import { current, enablePatches, isDraft, produceWithPatches, type Draft, type Patch } from 'immer';

import type { BuilderNode, Fragment, NodeTree } from './document';
import { createId, type NodeId } from './ids';
import { LIMITS } from './limits';
import type { ElementRegistry } from './registry';
import { rt, richTextToPlain, type RichText } from './rich-text';
import type { NodeStyle } from './style';
import { depthOf, descendants, parentOf, topLevelIds } from './tree';

enablePatches();

/**
 * Every change to a document, as a function over an immer draft.
 *
 * ── Why drafts and patches ───────────────────────────────────────────────────
 * An operation mutates a draft; immer turns that into a new document that
 * shares every untouched node with the old one (so React's reference checks
 * skip them) AND into forward and inverse patches — which is exactly what an
 * undo stack needs, without anybody writing an inverse by hand. `applyChange`
 * runs one; the history composes many.
 *
 * ── Rules are checked HERE, not in the UI ────────────────────────────────────
 * Placement, depth, size, minimum children and locks are enforced by the
 * operation itself, so the canvas, the layers panel, a keyboard shortcut and a
 * paste all get the same answer, and a UI that forgot to ask cannot corrupt a
 * document. A refused operation throws a `BuilderError` with a message key and
 * leaves the document exactly as it was.
 *
 * The functions take the draft typed as a plain `BuilderDocument` — the
 * document type has no readonly parts, so an immer draft of it IS one.
 */

export class BuilderError extends Error {
  constructor(
    public readonly code: string,
    public readonly params: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = 'BuilderError';
  }
}

export interface Change<T, D extends NodeTree = NodeTree> {
  doc: D;
  patches: Patch[];
  inversePatches: Patch[];
  result: T;
}

export function applyChange<T, D extends NodeTree = NodeTree>(
  doc: D,
  change: (draft: D) => T,
): Change<T, D> {
  // Boxed, so the recipe's return value is captured without being handed to
  // immer — which would take a returned value as a REPLACEMENT document.
  const box: { value?: T } = {};
  const [next, patches, inversePatches] = produceWithPatches(doc, (draft: Draft<D>) => {
    box.value = change(draft as D);
  });
  return { doc: next, patches, inversePatches, result: box.value as T };
}

// ── Small lookups that refuse instead of asserting ─────────────────────────

function nodeOf(doc: NodeTree, id: NodeId): BuilderNode {
  const node = doc.nodes[id];
  if (!node) throw new BuilderError('node.missing', { id });
  return node;
}

function childrenOf(node: BuilderNode): NodeId[] {
  if (!node.children) throw new BuilderError('node.notContainer', { type: node.type });
  return node.children;
}

function parentOfOrThrow(doc: NodeTree, id: NodeId): BuilderNode {
  const parent = parentOf(doc, id);
  if (!parent) throw new BuilderError('node.isRoot', { id });
  return parent;
}

function first<T>(values: readonly T[]): T {
  const [value] = values;
  if (value === undefined) throw new BuilderError('selection.empty');
  return value;
}

/**
 * A deep copy that also works on an immer draft — `structuredClone` cannot
 * copy the draft's proxy, so a draft is snapshotted with `current` first.
 */
function plainClone<T>(value: T): T {
  return structuredClone(isDraft(value) ? current(value) : value);
}

function removeNode(doc: NodeTree, id: NodeId): void {
  Reflect.deleteProperty(doc.nodes, id);
}

// ── Building nodes ─────────────────────────────────────────────────────────

/**
 * A new element as a fragment: its node, and — for a container — the children
 * its definition starts it with, recursively, so a fresh "columns" arrives as
 * two columns each holding a paragraph rather than as an empty box.
 */
export function createFragment(
  registry: ElementRegistry,
  type: string,
  props: Record<string, unknown> = {},
): Fragment {
  const nodes: Record<NodeId, BuilderNode> = {};
  const build = (nodeType: string, nodeProps: Record<string, unknown>): NodeId => {
    const definition = registry.require(nodeType);
    const id = createId();
    const parsed = definition.schema.safeParse({ ...definition.defaults(), ...nodeProps });
    if (!parsed.success) throw new BuilderError('props.invalid', { type: nodeType });
    const node: BuilderNode = { id, type: nodeType, v: definition.version, props: parsed.data };
    if (definition.container) {
      node.children = (definition.container.initial?.() ?? []).map((child) =>
        build(child.type, child.props ?? {}),
      );
    }
    nodes[id] = node;
    return id;
  };
  return { roots: [build(type, props)], nodes };
}

/**
 * The containers to build around `childType` so it can go into `parentType`,
 * outermost first — `['section', 'row', 'column']` for a text block dropped on
 * an email's empty body. `[]` when it fits as it is; `null` when nothing makes
 * it fit. Breadth-first, so the SHORTEST chain wins.
 */
export function wrapChain(
  registry: ElementRegistry,
  parentType: string,
  childType: string,
  maxDepth = 4,
): string[] | null {
  if (registry.canContain(parentType, childType)) return [];
  const containers = registry
    .all()
    .filter((definition) => definition.container)
    .map((definition) => definition.type);
  let frontier: { type: string; chain: string[] }[] = [{ type: parentType, chain: [] }];
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next: { type: string; chain: string[] }[] = [];
    for (const { type, chain } of frontier) {
      for (const candidate of containers) {
        if (chain.includes(candidate) || !registry.canContain(type, candidate)) continue;
        const path = [...chain, candidate];
        if (registry.canContain(candidate, childType)) return path;
        next.push({ type: candidate, chain: path });
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * A new element wrapped in `chain`'s containers, each holding only the next —
 * built empty rather than with their `initial` children, which would put a
 * second, unwanted block beside the one being inserted.
 */
export function createWrappedFragment(
  registry: ElementRegistry,
  chain: readonly string[],
  type: string,
  props: Record<string, unknown> = {},
  wrapperProps: Readonly<Record<string, Record<string, unknown>>> = {},
): Fragment {
  const inner = createFragment(registry, type, props);
  let fragment = inner;
  for (const wrapperType of [...chain].reverse()) {
    const definition = registry.require(wrapperType);
    const parsed = definition.schema.safeParse({
      ...definition.defaults(),
      ...(wrapperProps[wrapperType] ?? {}),
    });
    if (!parsed.success) throw new BuilderError('props.invalid', { type: wrapperType });
    const id = createId();
    fragment = {
      roots: [id],
      nodes: {
        ...fragment.nodes,
        [id]: {
          id,
          type: wrapperType,
          v: definition.version,
          props: parsed.data,
          children: [...fragment.roots],
        },
      },
    };
  }
  return fragment;
}

/** A deep copy of `ids` and everything under them, with fresh ids. */
export function extractFragment(doc: NodeTree, ids: readonly NodeId[]): Fragment {
  const top = topLevelIds(doc, ids);
  const nodes: Record<NodeId, BuilderNode> = {};
  for (const id of top) {
    nodes[id] = plainClone(nodeOf(doc, id));
    for (const node of descendants(doc, id)) nodes[node.id] = plainClone(node);
  }
  return reidFragment({ roots: top, nodes });
}

/** The same fragment with every id replaced — safe to insert again. */
export function reidFragment(fragment: Fragment): Fragment {
  const map = new Map<NodeId, NodeId>();
  for (const id of Object.keys(fragment.nodes)) map.set(id, createId());
  const rename = (id: NodeId): NodeId => map.get(id) ?? id;
  const nodes: Record<NodeId, BuilderNode> = {};
  for (const [oldId, node] of Object.entries(fragment.nodes)) {
    const id = rename(oldId);
    nodes[id] = {
      ...structuredClone(node),
      id,
      ...(node.children ? { children: node.children.map(rename) } : {}),
    };
  }
  return { roots: fragment.roots.map(rename), nodes };
}

function heightIn(nodes: Record<NodeId, BuilderNode>, id: NodeId): number {
  const children = nodes[id]?.children ?? [];
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map((child) => heightIn(nodes, child)));
}

// ── Checks shared by the operations ───────────────────────────────────────

function assertCanContain(registry: ElementRegistry, parent: BuilderNode, childType: string) {
  if (!registry.canContain(parent.type, childType)) {
    throw new BuilderError('placement.notAllowed', { parent: parent.type, child: childType });
  }
}

function assertUnlocked(node: BuilderNode) {
  if (node.locked) throw new BuilderError('node.locked', { id: node.id });
}

function assertRoomFor(registry: ElementRegistry, parent: BuilderNode, adding: number) {
  const max = registry.get(parent.type)?.container?.max;
  if (max !== undefined && (parent.children?.length ?? 0) + adding > max) {
    throw new BuilderError('container.full', { type: parent.type, max });
  }
}

function assertCanLose(registry: ElementRegistry, parent: BuilderNode, losing: number) {
  const min = registry.get(parent.type)?.container?.min;
  if (min !== undefined && (parent.children?.length ?? 0) - losing < min) {
    throw new BuilderError('container.minimum', { type: parent.type, min });
  }
}

function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, Math.trunc(index)));
}

// ── The operations ─────────────────────────────────────────────────────────

/** Insert a fragment's roots under `parentId` at `index`. Returns their ids. */
export function insert(
  draft: NodeTree,
  registry: ElementRegistry,
  parentId: NodeId,
  index: number,
  fragment: Fragment,
): NodeId[] {
  const parent = nodeOf(draft, parentId);
  const siblings = childrenOf(parent);
  for (const id of fragment.roots) {
    const node = fragment.nodes[id];
    if (!node) throw new BuilderError('fragment.invalid');
    assertCanContain(registry, parent, node.type);
  }
  for (const id of Object.keys(fragment.nodes)) {
    if (id in draft.nodes) throw new BuilderError('fragment.idTaken', { id });
  }
  assertRoomFor(registry, parent, fragment.roots.length);

  const total = Object.keys(draft.nodes).length + Object.keys(fragment.nodes).length;
  if (total > LIMITS.nodes) throw new BuilderError('document.tooManyNodes', { max: LIMITS.nodes });

  const baseDepth = depthOf(draft, parentId) + 1;
  for (const id of fragment.roots) {
    if (baseDepth + heightIn(fragment.nodes, id) > LIMITS.depth) {
      throw new BuilderError('document.tooDeep', { max: LIMITS.depth });
    }
  }

  for (const node of Object.values(fragment.nodes)) draft.nodes[node.id] = structuredClone(node);
  siblings.splice(clampIndex(index, siblings.length), 0, ...fragment.roots);
  return [...fragment.roots];
}

/**
 * Move nodes to `parentId` at `index`.
 *
 * `index` is where the drop indicator sits in the target's CURRENT children —
 * before the moved nodes are taken out — because that is the only index the
 * canvas and the layers panel can show. Nodes moved from earlier in the same
 * container shift it down accordingly.
 */
export function move(
  draft: NodeTree,
  registry: ElementRegistry,
  ids: readonly NodeId[],
  parentId: NodeId,
  index: number,
): NodeId[] {
  const moving = topLevelIds(draft, ids);
  if (moving.length === 0) return [];
  const target = nodeOf(draft, parentId);
  const targetChildren = childrenOf(target);

  for (const id of moving) {
    const node = nodeOf(draft, id);
    assertUnlocked(node);
    // Before placement: "a section cannot go in a section" would be true, but
    // it is not the reason this move is impossible.
    if (id === parentId || descendants(draft, id).some((inner) => inner.id === parentId)) {
      throw new BuilderError('move.intoItself');
    }
    assertCanContain(registry, target, node.type);
  }

  // Moves within the target do not count against its maximum; a source's
  // minimum is checked once per source container.
  const fromTarget = moving.filter((id) => targetChildren.includes(id)).length;
  assertRoomFor(registry, target, moving.length - fromTarget);
  const bySource = new Map<NodeId, number>();
  for (const id of moving) {
    const source = parentOfOrThrow(draft, id);
    if (source.id !== parentId) bySource.set(source.id, (bySource.get(source.id) ?? 0) + 1);
  }
  for (const [sourceId, count] of bySource) assertCanLose(registry, nodeOf(draft, sourceId), count);

  const baseDepth = depthOf(draft, parentId) + 1;
  for (const id of moving) {
    if (baseDepth + heightIn(draft.nodes, id) > LIMITS.depth) {
      throw new BuilderError('document.tooDeep', { max: LIMITS.depth });
    }
  }

  let at = clampIndex(index, targetChildren.length);
  at -= moving.filter((id) => {
    const position = targetChildren.indexOf(id);
    return position !== -1 && position < at;
  }).length;

  for (const id of moving) {
    const sourceChildren = childrenOf(parentOfOrThrow(draft, id));
    sourceChildren.splice(sourceChildren.indexOf(id), 1);
  }
  targetChildren.splice(clampIndex(at, targetChildren.length), 0, ...moving);
  return moving;
}

/** Remove nodes and everything under them. */
export function remove(
  draft: NodeTree,
  registry: ElementRegistry,
  ids: readonly NodeId[],
): NodeId[] {
  const removing = topLevelIds(draft, ids);
  const bySource = new Map<NodeId, number>();
  for (const id of removing) {
    assertUnlocked(nodeOf(draft, id));
    const source = parentOfOrThrow(draft, id);
    bySource.set(source.id, (bySource.get(source.id) ?? 0) + 1);
  }
  for (const [sourceId, count] of bySource) assertCanLose(registry, nodeOf(draft, sourceId), count);

  for (const id of removing) {
    const sourceChildren = childrenOf(parentOfOrThrow(draft, id));
    for (const node of descendants(draft, id)) removeNode(draft, node.id);
    sourceChildren.splice(sourceChildren.indexOf(id), 1);
    removeNode(draft, id);
  }
  return removing;
}

/** Copies of `ids`, each placed right after its original. Returns the copies. */
export function duplicate(
  draft: NodeTree,
  registry: ElementRegistry,
  ids: readonly NodeId[],
): NodeId[] {
  const created: NodeId[] = [];
  // Last first, so inserting a copy never shifts an original still waiting to
  // be copied.
  for (const id of [...topLevelIds(draft, ids)].reverse()) {
    const parent = parentOfOrThrow(draft, id);
    const copy = extractFragment(draft, [id]);
    created.unshift(
      ...insert(draft, registry, parent.id, childrenOf(parent).indexOf(id) + 1, copy),
    );
  }
  return created;
}

export interface NodePatch {
  props?: Record<string, unknown> | undefined;
  style?: NodeStyle | null | undefined;
  name?: string | null | undefined;
  anchor?: string | null | undefined;
  hidden?: boolean | undefined;
  locked?: boolean | undefined;
}

/**
 * Change a node. `props` is merged over the current props and the result must
 * pass the element's schema; `null` clears an optional field. A locked node
 * accepts exactly one change: being unlocked.
 */
export function update(
  draft: NodeTree,
  registry: ElementRegistry,
  id: NodeId,
  patch: NodePatch,
): void {
  const node = nodeOf(draft, id);
  const onlyUnlocking = Object.keys(patch).length === 1 && patch.locked === false;
  if (!onlyUnlocking) assertUnlocked(node);

  if (patch.props) {
    const definition = registry.require(node.type);
    const parsed = definition.schema.safeParse({ ...node.props, ...patch.props });
    if (!parsed.success) {
      throw new BuilderError('props.invalid', {
        type: node.type,
        path: parsed.error.issues[0]?.path.join('.') ?? '',
      });
    }
    node.props = parsed.data;
  }
  if (patch.style !== undefined) {
    if (patch.style === null) delete node.style;
    else node.style = structuredClone(patch.style);
  }
  if (patch.name !== undefined) {
    const name = patch.name?.trim() ?? '';
    if (name) node.name = name.slice(0, 80);
    else delete node.name;
  }
  if (patch.anchor !== undefined) {
    if (patch.anchor) node.anchor = patch.anchor;
    else delete node.anchor;
  }
  if (patch.hidden !== undefined) {
    if (patch.hidden) node.hidden = true;
    else delete node.hidden;
  }
  if (patch.locked !== undefined) {
    if (patch.locked) node.locked = true;
    else delete node.locked;
  }
}

/** Put `ids` (siblings) inside a new container of `type`, where the first was. */
export function wrap(
  draft: NodeTree,
  registry: ElementRegistry,
  ids: readonly NodeId[],
  type: string,
): NodeId {
  const wrapping = topLevelIds(draft, ids);
  const parent = parentOfOrThrow(draft, first(wrapping));
  if (wrapping.some((id) => parentOf(draft, id)?.id !== parent.id)) {
    throw new BuilderError('wrap.notSiblings');
  }
  const definition = registry.require(type);
  if (!definition.container) throw new BuilderError('node.notContainer', { type });
  assertCanContain(registry, parent, type);

  // Built EMPTY rather than through `createFragment`: the container is about
  // to be filled with the wrapped nodes, not with its default paragraph.
  const containerId = createId();
  const fragment: Fragment = {
    roots: [containerId],
    nodes: {
      [containerId]: {
        id: containerId,
        type,
        v: definition.version,
        props: definition.defaults(),
        children: [],
      },
    },
  };
  insert(draft, registry, parent.id, childrenOf(parent).indexOf(first(wrapping)), fragment);
  move(draft, registry, wrapping, containerId, 0);
  return containerId;
}

/** Replace a container by its children, in place. */
export function unwrap(draft: NodeTree, registry: ElementRegistry, id: NodeId): NodeId[] {
  const node = nodeOf(draft, id);
  assertUnlocked(node);
  const children = [...childrenOf(node)];
  const parent = parentOfOrThrow(draft, id);
  for (const childId of children) assertCanContain(registry, parent, nodeOf(draft, childId).type);

  const siblings = childrenOf(parent);
  siblings.splice(siblings.indexOf(id), 1, ...children);
  node.children = [];
  removeNode(draft, id);
  return children;
}

// ── Changing an element's type ─────────────────────────────────────────────

/** The elements whose content is essentially "some text", and can trade places. */
export const TEXT_FAMILY = [
  'paragraph',
  'heading',
  'quote',
  'pull-quote',
  'callout',
  'list',
  'disclaimer',
] as const;

const isTextFamily = (type: string) => (TEXT_FAMILY as readonly string[]).includes(type);

function textOf(node: BuilderNode): RichText {
  const props = node.props;
  if (node.type === 'list') {
    const items = (props.items as { text: RichText }[] | undefined) ?? [];
    return items.flatMap((item, index) =>
      index === 0 ? item.text : [{ text: ' ' }, ...item.text],
    );
  }
  if (node.type === 'pull-quote') return rt(typeof props.text === 'string' ? props.text : '');
  return (props.text as RichText | undefined) ?? [];
}

function textProps(type: string, text: RichText): Record<string, unknown> {
  if (type === 'list') return { items: [{ text }] };
  if (type === 'pull-quote') return { text: richTextToPlain(text).slice(0, 300) };
  return { text };
}

/** Turn a text element into another, keeping its words. */
export function replaceType(
  draft: NodeTree,
  registry: ElementRegistry,
  id: NodeId,
  type: string,
): void {
  const node = nodeOf(draft, id);
  assertUnlocked(node);
  if (node.type === type) return;
  if (!isTextFamily(node.type) || !isTextFamily(type)) {
    throw new BuilderError('replace.notCompatible', { from: node.type, to: type });
  }
  assertCanContain(registry, parentOfOrThrow(draft, id), type);

  const definition = registry.require(type);
  const parsed = definition.schema.safeParse({
    ...definition.defaults(),
    ...textProps(type, textOf(node)),
  });
  if (!parsed.success) throw new BuilderError('props.invalid', { type });
  node.type = type;
  node.v = definition.version;
  node.props = parsed.data;
}

/** Which types `node` could be turned into, for the "Turn into" menu. */
export function replaceableTypes(node: BuilderNode): string[] {
  return isTextFamily(node.type) ? TEXT_FAMILY.filter((type) => type !== node.type) : [];
}
