import { richTextToPlain, type Breakpoint, type EngineDocument } from '../../core';
import { Component, type ReactNode } from 'react';

import type { EditorProfile } from '../profile';

/** A document drawn as readers see it: the kit's preview, or its canvas with plain text. */
export function renderReadOnly<TDoc extends EngineDocument>(
  profile: EditorProfile<TDoc>,
  args: { doc: TDoc; viewport: Breakpoint; locale?: string | undefined },
): ReactNode {
  if (profile.renderPreview) return profile.renderPreview(args);
  return profile.renderCanvas({ ...args, editText: (field) => richTextToPlain(field.value) });
}

/** Draws nothing rather than taking the editor down when a preview cannot be drawn. */
export class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
