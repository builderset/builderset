import type { z } from 'zod';

import type { BuilderDocument, BuilderNode } from './document';
import type { Issue } from './issues';
import type { MediaRef } from './media';

/**
 * The element registry — the one API built-in elements and plugins share.
 *
 * An element is DATA about a node type: its props schema, its defaults, where
 * it may sit, how to read it as plain text, how to migrate old props, and what
 * the checker should say about it. The editor's and the renderer's components
 * are registered separately, by their own packages, against the same `type`;
 * this file knows nothing about React, which is what lets the server, a CLI or
 * a test use the same definitions.
 *
 * A third party adds an element exactly the way the standard library does —
 * `defineElement` and `registry.register` — which is the test that the API is
 * sufficient: the MotorsAL elements are written against nothing else.
 */

export const CATEGORIES = ['layout', 'text', 'media', 'article', 'engagement', 'plugin'] as const;
export type ElementCategory = (typeof CATEGORIES)[number];

export interface ContainerRule {
  /** Only these child types. Wins over `except`. */
  only?: readonly string[] | undefined;
  /** Any placeable element except these. */
  except?: readonly string[] | undefined;
  min?: number | undefined;
  max?: number | undefined;
  /** What a freshly inserted container starts with, so it is never an empty box. */
  initial?: (() => { type: string; props?: Record<string, unknown> }[]) | undefined;
}

export interface CheckContext {
  node: BuilderNode;
  document: BuilderDocument;
}

export interface ElementDefinition<P extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  /** Bump when the props change incompatibly, and handle the old shape in `migrate`. */
  version: number;
  category: ElementCategory;
  /** A lucide icon name, in kebab-case (`heading-2`, `image`). */
  icon: string;
  /** Extra words the insert search should match. */
  keywords?: readonly string[] | undefined;
  schema: z.ZodType<P>;
  defaults: () => P;
  /** Present on elements that hold other elements. */
  container?: ContainerRule | undefined;
  /** Only valid inside these parent types (a column only in columns). */
  parents?: readonly string[] | undefined;
  /** Never offered in the insert menu — the root, a column. */
  internal?: boolean | undefined;
  /** Old props → props of `version`. Called once per step behind. */
  migrate?: ((fromVersion: number, props: unknown) => unknown) | undefined;
  /** The text a reader would read — for word count, search and excerpts. */
  toPlainText?: ((props: P) => string) | undefined;
  /** Every link the element carries, for the checker and the server. */
  links?: ((props: P) => string[]) | undefined;
  /** Every piece of media the element references. */
  media?: ((props: P) => MediaRef[]) | undefined;
  /** Semantic issues — missing alt text, empty items. */
  check?: ((props: P, context: CheckContext) => Issue[]) | undefined;
}

/** Identity with inference — the way to declare an element. */
export function defineElement<P extends Record<string, unknown>>(
  definition: ElementDefinition<P>,
): ElementDefinition<P> {
  return definition;
}

// The registry stores definitions with their props widened: a definition's
// callbacks are only ever handed props its own schema produced.
type AnyDefinition = ElementDefinition;

export class ElementRegistry {
  private readonly definitions = new Map<string, AnyDefinition>();

  constructor(definitions: readonly ElementDefinition<never>[] = []) {
    for (const definition of definitions) this.register(definition);
  }

  register<P extends Record<string, unknown>>(definition: ElementDefinition<P>): this {
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(definition.type)) {
      throw new Error(
        `Element type "${definition.type}" must be kebab-case, starting with a letter.`,
      );
    }
    if (this.definitions.has(definition.type)) {
      throw new Error(`Element type "${definition.type}" is already registered.`);
    }
    if (!Number.isInteger(definition.version) || definition.version < 1) {
      throw new Error(`Element "${definition.type}" needs a positive integer version.`);
    }
    const defaults = definition.schema.safeParse(definition.defaults());
    if (!defaults.success) {
      throw new Error(
        `Element "${definition.type}" has defaults its own schema rejects: ${defaults.error.message}`,
      );
    }
    this.definitions.set(definition.type, definition as unknown as AnyDefinition);
    return this;
  }

  get(type: string): AnyDefinition | undefined {
    return this.definitions.get(type);
  }

  require(type: string): AnyDefinition {
    const definition = this.definitions.get(type);
    if (!definition) throw new Error(`Unknown element type "${type}".`);
    return definition;
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  all(): AnyDefinition[] {
    return [...this.definitions.values()];
  }

  /** What the insert menu offers, in registration order. */
  insertable(): AnyDefinition[] {
    return this.all().filter((definition) => !definition.internal);
  }

  isContainer(type: string): boolean {
    return Boolean(this.definitions.get(type)?.container);
  }

  /** Whether `childType` may sit directly inside `parentType`. */
  canContain(parentType: string, childType: string): boolean {
    const parent = this.definitions.get(parentType);
    const child = this.definitions.get(childType);
    if (!parent?.container || !child) return false;
    const rule = parent.container;
    // An element that names its parents goes exactly where it names — and
    // nowhere else, even a container whose `except` list would let it in.
    if (child.parents) {
      return child.parents.includes(parentType) && (!rule.only || rule.only.includes(childType));
    }
    if (rule.only) return rule.only.includes(childType);
    return !(rule.except ?? []).includes(childType);
  }
}
