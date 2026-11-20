import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildCard, createCardRegistry, EXAMPLE_MEMBERS, el, side } from '../core';
import { CardView } from './card-view';
import { CardPrintSheet } from './print-sheet';
import { cardStyle, inkOn } from './style';
import { cardWords } from './words';

const registry = createCardRegistry();
const member = EXAMPLE_MEMBERS[0] ?? {};

const card = () =>
  buildCard(registry, {
    meta: { name: 'Test' },
    stable: true,
    card: { print: { bleed: 2 } },
    front: side('#111827', [
      el('field', [4, 20, 50, 6], { text: 'Hi {{member.name}}' }),
      el('qr', [60, 20, 20, 20]),
      el('text', [4, 30, 40, 5], { text: 'Not printed' }, { hidden: true }),
      el('photo', [60, 2, 10, 12]),
    ]),
    back: side('#ffffff', [
      el('barcode', [10, 10, 50, 8]),
      el('barcode', [10, 30, 50, 8], { data: 'Kodi ë' }),
    ]),
  });

describe('<CardView>', () => {
  it('draws one side at its size, the hidden left out, in the ink that reads on it', () => {
    const { container } = render(<CardView document={card()} scale={2} />);
    const view = screen.getByRole('group', { name: 'Front' });
    expect(view).toHaveStyle({ '--bsc-mm': '2px', '--bsc-w': '85.6' });
    expect(container.querySelectorAll('.bsc-el')).toHaveLength(3);
    expect(screen.queryByText('Not printed')).toBeNull();
    // No colour of its own on a dark side: white.
    expect(container.querySelector('.bsc-text')).toHaveStyle({ color: '#ffffff' });
  });

  it('fills a member in: the words, the QR code and the photo placeholder', () => {
    render(<CardView document={card()} record={member} />);
    expect(screen.getByText('Hi Arben Hoxha')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR code: MA02481173' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo' })).toBeInTheDocument();
  });

  it('marks variables when asked, and draws a real Code 128 or says it cannot', () => {
    const { container } = render(<CardView document={card()} face="back" markVariables />);
    const view = screen.getByRole('group', { name: 'Back' });
    expect(
      within(view).getByRole('img', { name: 'Barcode: {{member.number}}' }),
    ).toBeInTheDocument();
    expect(
      within(view).getByRole('img', { name: 'This value cannot be encoded' }),
    ).toBeInTheDocument();
    expect(container.querySelector('.bsc-code path')?.getAttribute('d')).toMatch(/^M10 0h2v40h-2z/);
  });

  it('speaks Albanian and German', () => {
    render(<CardView document={card()} words={cardWords('sq-AL')} />);
    expect(screen.getByRole('group', { name: 'Përpara' })).toBeInTheDocument();
    expect(cardWords('de').back).toBe('Rückseite');
  });
});

describe('<CardPrintSheet>', () => {
  it('lays out a page per side per member, at real size with its bleed and crop marks', () => {
    const { container } = render(<CardPrintSheet document={card()} records={EXAMPLE_MEMBERS} />);
    const pages = container.querySelectorAll('.bsc-page');
    expect(pages).toHaveLength(EXAMPLE_MEMBERS.length * 2);
    expect(screen.getByRole('region', { name: 'Back, card 3 of 3' })).toBeInTheDocument();
    const first = container.querySelector('.bsc');
    expect(first).toHaveStyle({ '--bsc-mm': '1mm', '--bleed': '2' });
    expect(first).toHaveClass('bsc-bleed');
    expect(container.querySelectorAll('.bsc-crop')).toHaveLength(6);
    expect(container.querySelector('style')?.textContent).toContain('size: 105.6mm 73.98mm');
  });
});

describe('the look', () => {
  it('scales with one variable and picks a readable ink', () => {
    expect(cardStyle({ width: 85.6, height: 53.98, radius: 3.18 }, '1mm')).toMatchObject({
      '--bsc-mm': '1mm',
    });
    expect(inkOn('#ffffff')).toBe('#111827');
    expect(inkOn('#111827')).toBe('#ffffff');
  });
});
