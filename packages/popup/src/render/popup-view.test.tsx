import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildPopup, createPopupRegistry, el, type FormatPatch, type PopupDocument } from '../core';
import { buildTemplatePopup, POPUP_TEMPLATES } from '../templates';
import { PopupPicture } from './picture';
import { PopupView, type PopupViewProps } from './popup-view';
import { qrModules } from './qr';
import { memoryStore } from './store';
import { popupScale } from './style';
import { popupWords } from './words';

const registry = createPopupRegistry();

function popup(format: FormatPatch = {}): PopupDocument {
  return buildPopup(registry, { meta: { name: 'Vlerësim' }, format, stable: true }, [
    el('heading', [24, 24, 400, 34], { text: 'Sa vlen makina, {{visitor.first_name}}?' }),
    el('input', [24, 80, 272, 44], { name: 'plate', label: 'Targa', kind: 'plate' }),
    el('button', [24, 136, 272, 46], {
      text: 'Vlerëso',
      action: 'submit',
      thanks: 'Faleminderit!',
    }),
    el('text', [24, 190, 272, 20], { text: 'Jo tani', action: 'close' }, { name: 'Not now' }),
    el('button', [24, 220, 272, 46], { text: 'Si funksionon', url: '/si-funksionon' }),
    el('close', [478, 12, 30, 30]),
  ]);
}

const desktop = { device: 'desktop' as const, path: '/' };

function show(props: Partial<PopupViewProps> & { document?: PopupDocument } = {}) {
  const store = props.store ?? memoryStore();
  const view = render(
    <PopupView
      document={props.document ?? popup({ display: { trigger: 'load' } })}
      store={store}
      storageKey="p1"
      context={desktop}
      data={{ visitor: { first_name: 'Ana' } }}
      {...props}
    />,
  );
  return { ...view, store };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PopupView', () => {
  it('opens on load as a modal dialog named by its heading, variables filled in', () => {
    const onEvent = vi.fn();
    const { store } = show({ onEvent });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Sa vlen makina, Ana?');
    expect(onEvent).toHaveBeenCalledWith('shown');
    expect(store.read('p1')?.shownAt).toBeTypeOf('number');
    // A modal takes the keyboard: the first input has it.
    expect(screen.getByRole('textbox', { name: 'Targa' })).toHaveFocus();
  });

  it('waits for its delay', () => {
    show({ document: popup({ display: { trigger: 'delay', delay: 6 } }) });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(5999);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shortens a delay in a preview', () => {
    show({ document: popup({ display: { trigger: 'delay', delay: 30 } }), maxDelay: 700 });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps to its display rules, and remembers its frequency', () => {
    const hidden = show({ document: popup({ display: { trigger: 'load', desktop: false } }) });
    expect(screen.queryByRole('dialog')).toBeNull();
    hidden.unmount();

    const store = memoryStore({ p1: { shownAt: Date.now() - 1000 } });
    show({ document: popup({ display: { trigger: 'load', frequency: 'days', days: 7 } }), store });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ignores the rules in a preview', () => {
    show({ document: popup({ display: { trigger: 'load', desktop: false } }), rules: false });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes with the ×, remembers it, and gives the focus back', () => {
    const before = document.createElement('button');
    document.body.append(before);
    before.focus();
    const onEvent = vi.fn();
    const onClose = vi.fn();
    const { store } = show({ onEvent, onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledWith('close');
    expect(onEvent).toHaveBeenLastCalledWith('closed');
    expect(store.read('p1')?.closedAt).toBeTypeOf('number');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(before).toHaveFocus();
    before.remove();
  });

  it('closes with Esc, a click on the page behind, a "close" text, and by itself', () => {
    const onClose = vi.fn();
    const first = show({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenLastCalledWith('esc');
    first.unmount();

    const second = show({ onClose });
    const dim = second.container.querySelector('.bsp-dim');
    if (!dim) throw new Error('no overlay');
    fireEvent.click(dim);
    expect(onClose).toHaveBeenLastCalledWith('outside');
    second.unmount();

    const onClick = vi.fn();
    const third = show({ onClose, onClick });
    fireEvent.click(screen.getByRole('button', { name: 'Jo tani' }));
    expect(onClick).toHaveBeenCalledWith({ action: 'close', id: 'n4', name: 'Not now' });
    third.unmount();

    const { store } = show({
      onClose,
      document: popup({ display: { trigger: 'load' }, motion: { autoClose: 5 } }),
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onClose).toHaveBeenLastCalledWith('auto');
    // Closing by itself is not the visitor's answer.
    expect(store.read('p1')?.closedAt).toBeUndefined();
  });

  it('does not close with Esc when the popup says not to', () => {
    const onClose = vi.fn();
    show({ onClose, document: popup({ display: { trigger: 'load' }, motion: { esc: false } }) });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside a modal', () => {
    show();
    const links = screen.getAllByRole('link');
    const last = screen.getByRole('button', { name: 'Close' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('textbox')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    expect(links[0]).toHaveAttribute('href', '/si-funksionon');
  });

  it('counts a link click and closes', () => {
    const onEvent = vi.fn();
    const onClick = vi.fn();
    show({ onEvent, onClick });
    fireEvent.click(screen.getByRole('link', { name: 'Si funksionon' }));
    expect(onClick).toHaveBeenCalledWith({ action: 'link', id: 'n5', url: '/si-funksionon' });
    expect(onEvent).toHaveBeenCalledWith('clicked');
  });

  it('checks the answers, sends them, then thanks', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const onEvent = vi.fn();
    const { store } = show({ onSubmit, onEvent, words: popupWords('sq') });
    fireEvent.click(screen.getByRole('button', { name: 'Vlerëso' }));
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Plotësoni këtë fushë.');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: ' AA 123 BC ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Vlerëso' }));
      await Promise.resolve();
    });
    expect(onSubmit).toHaveBeenCalledWith({ plate: 'AA 123 BC' }, { action: 'submit', id: 'n3' });
    expect(screen.getByRole('status')).toHaveTextContent('Faleminderit!');
    expect(onEvent).toHaveBeenCalledWith('submitted');
    expect(store.read('p1')?.submittedAt).toBeTypeOf('number');
  });

  it('stays on the form when the host refuses it', async () => {
    show({ onSubmit: () => Promise.resolve(false) });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'TR-482-KL' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Vlerëso' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('did not go through');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('opens on a click on its selector, again after it closes', () => {
    const page = document.createElement('div');
    page.innerHTML = '<a href="#vlereso" id="vlereso">Vlerëso</a>';
    document.body.append(page);
    show({ document: popup({ display: { trigger: 'click', selector: '#vlereso' } }) });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('Vlerëso', { selector: 'a' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('Vlerëso', { selector: 'a' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    page.remove();
  });

  it('opens at its scroll depth inside a preview’s page', () => {
    const page = document.createElement('div');
    Object.defineProperties(page, {
      scrollHeight: { value: 2000 },
      clientHeight: { value: 1000 },
    });
    document.body.append(page);
    show({ document: popup({ display: { trigger: 'scroll', scroll: 50 } }), scope: page });
    expect(screen.queryByRole('dialog')).toBeNull();
    page.scrollTop = 400;
    fireEvent.scroll(page);
    expect(screen.queryByRole('dialog')).toBeNull();
    page.scrollTop = 500;
    fireEvent.scroll(page);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    page.remove();
  });

  it('opens when the mouse leaves through the top', () => {
    show({ document: popup({ display: { trigger: 'exit' } }) });
    fireEvent.mouseOut(document, { clientY: 200 });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.mouseOut(document, { clientY: -2, relatedTarget: null });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('is a region, not a dialog, inside the page', () => {
    show({ document: popup({ type: 'inline', width: 520, display: { trigger: 'load' } }) });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region')).toHaveAccessibleName('Sa vlen makina, Ana?');
  });

  it('counts down every second', () => {
    vi.setSystemTime(new Date(2026, 10, 30, 23, 58, 0));
    show({
      document: buildPopup(registry, { format: { display: { trigger: 'load' } }, stable: true }, [
        el('countdown', [0, 0, 230, 52], { to: '2026-11-30T23:59' }),
        el('close', [478, 12, 30, 30]),
      ]),
    });
    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('01min00sec');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(timer).toHaveTextContent('00min59sec');
  });
});

describe('fitting a phone', () => {
  it('scales a modal to the screen with a margin, a bar to its width, never up', () => {
    const modal = popup().nodes.root?.props;
    if (!modal) throw new Error('no root');
    const format = modal as Parameters<typeof popupScale>[0];
    expect(popupScale(format, { width: 390, height: 800 })).toBeCloseTo(358 / 520);
    expect(popupScale(format, { width: 1440, height: 900 })).toBe(1);
    expect(
      popupScale({ ...format, type: 'bartop', width: 1100 }, { width: 550, height: 800 }),
    ).toBe(0.5);
  });
});

describe('PopupPicture and QR codes', () => {
  it('draws every template still', () => {
    for (const template of POPUP_TEMPLATES) {
      const view = render(<PopupPicture document={buildTemplatePopup(registry, template)} />);
      expect(view.container.querySelector('.bsp-stage')?.children.length).toBe(
        template.elements.length,
      );
      view.unmount();
    }
  });

  it('makes a code of the smallest version that holds the text', () => {
    expect(qrModules('A')?.length).toBe(21);
    expect(qrModules('https://marrimauto.com/app')?.length).toBe(25);
    expect(qrModules('x'.repeat(3000))).toBeNull();
  });
});
