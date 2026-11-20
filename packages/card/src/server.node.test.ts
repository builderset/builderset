import * as card from '@builderset/card';
import * as host from '@builderset/card/host';
import { cardWords } from '@builderset/card/render';
import { describe, expect, it } from 'vitest';

/**
 * The entries a server imports load in plain Node: no `window`, no
 * `document`. The imports above are the test — a module that touched the DOM
 * while loading would fail this file before any test ran. A server checks a
 * design, and issues a member's card with the data frozen in it.
 */
describe('on a server', () => {
  const registry = card.createCardRegistry();
  const doc = card.buildCard(registry, {
    meta: { name: 'Server' },
    card: { sides: 1 },
    front: card.side('#111827', [card.el('field', [5, 5, 50, 6], { text: '{{member.name}}' })]),
  });

  it('checks a design and fills one in', () => {
    expect(typeof window).toBe('undefined');
    expect(card.checkCard(doc, registry)).toEqual([]);
    expect(card.fieldsUsed(doc)).toEqual(['member.name']);
    const issued = card.fillCard(doc, { 'member.name': 'Elira Daci' });
    expect(Object.values(issued.nodes).some((node) => node.props.text === 'Elira Daci')).toBe(true);
    expect(card.encodeQr('MA01920456')?.size).toBe(21);
    expect(cardWords('sq').front).toBe('Përpara');
  });

  it('loads the host entry', () => {
    expect(typeof host.createRestHost).toBe('function');
  });
});
