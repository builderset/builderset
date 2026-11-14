'use client';

import {
  DrawerPanel,
  Overlay,
  OverlayBody,
  OverlayDescription,
  OverlayHeader,
  OverlayTitle,
} from '../ui';
import type { ReactNode } from 'react';

import { useEditorContext } from '../context';

/**
 * A secondary panel — history, shortcuts, scheduling.
 *
 * A drawer from the right on anything wider than a phone, where a bottom sheet
 * would cover the canvas the writer is looking at; `DrawerPanel` itself turns
 * into a bottom sheet below `sm`, which is the right shape for a thumb.
 */
export function SideDrawer({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
}) {
  const { messages } = useEditorContext();
  return (
    <Overlay
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerPanel
        side="right"
        closeLabel={messages.close}
        className="bst:sm:w-[min(26rem,calc(100vw-2rem))]"
      >
        <OverlayHeader className="bst:border-b bst:border-border bst:px-5 bst:py-4">
          <OverlayTitle>{title}</OverlayTitle>
          {description ? <OverlayDescription>{description}</OverlayDescription> : null}
        </OverlayHeader>
        <OverlayBody className="bld-panel bst:flex-1 bst:overflow-y-auto">{children}</OverlayBody>
      </DrawerPanel>
    </Overlay>
  );
}
