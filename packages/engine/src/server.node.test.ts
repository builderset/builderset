import * as core from '@motors/engine';
import * as host from '@motors/engine/host';
import { describe, expect, it } from 'vitest';

/**
 * The entries a server imports load in plain Node: no `window`, no
 * `document`, no `DOMParser` (docs/builder_packages/steps/07). The imports
 * above are the test — a module that touched the DOM while loading would fail
 * this file before any test ran.
 */
describe('on a server', () => {
  it('has no DOM here', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof DOMParser).toBe('undefined');
  });

  it('loads the core and the host entry', () => {
    expect(typeof core.structuralIssues).toBe('function');
    expect(typeof host.createRestHost).toBe('function');
    expect(typeof host.createMemoryHost).toBe('function');
  });
});
