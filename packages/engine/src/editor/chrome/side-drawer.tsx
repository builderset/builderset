'use client';

import {
  Button,
  DrawerPanel,
  Overlay,
  OverlayBody,
  OverlayClose,
  OverlayDescription,
  OverlayHeader,
  OverlayTitle,
} from '../ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { useEditorContext } from '../context';

/**
 * A secondary panel — history, shortcuts, scheduling.
 *
 * A drawer from the right on anything wider than a phone, where a bottom sheet
 * would cover the canvas the writer is looking at; `DrawerPanel` itself turns
 * into a bottom sheet below `sm`, which is the right shape for a thumb.
 *
 * Its header is one row — an icon tile, the title with a line under it, and the
 * close button in the same row — so nothing floats over the corner. The overlay
 * bands' rule takes the header's own padding (the band reaches the edges), so
 * the inset is on the row inside it. A `toolbar` sits under the header and does
 * not scroll with the body.
 */
export function SideDrawer({
  open,
  onClose,
  title,
  description,
  icon,
  toolbar,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  /** Shown in a tile beside the title. */
  icon?: ReactNode;
  /** A band under the header that stays put while the body scrolls. */
  toolbar?: ReactNode;
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
        hideClose
        closeLabel={messages.close}
        className="bst:sm:w-[min(26rem,calc(100vw-2rem))]"
      >
        <OverlayHeader>
          <div className="bst:flex bst:items-start bst:gap-3 bst:px-5 bst:pt-4 bst:pb-3.5">
            {icon ? (
              <span
                aria-hidden="true"
                className="bst:grid bst:size-9 bst:shrink-0 bst:place-items-center bst:rounded-[10px] bst:border bst:border-border bst:bg-gradient-to-b bst:from-card bst:to-muted bst:text-foreground bst:shadow-[0_1px_2px_rgb(0_0_0/0.06)] bst:[&_svg]:size-[17px]"
              >
                {icon}
              </span>
            ) : null}
            <div className="bst:min-w-0 bst:flex-1 bst:pt-px">
              <OverlayTitle className="bst:pr-0 bst:text-[15px]">{title}</OverlayTitle>
              {description ? (
                <OverlayDescription className="bst:mt-0.5 bst:pr-0 bst:text-[12.5px]">
                  {description}
                </OverlayDescription>
              ) : null}
            </div>
            <OverlayClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={messages.close}
                className="bst:-mt-0.5 bst:-mr-1.5 bst:size-8 bst:shrink-0 bst:rounded-lg bst:text-muted-foreground bst:hover:text-foreground"
              >
                <X aria-hidden="true" />
              </Button>
            </OverlayClose>
          </div>
        </OverlayHeader>
        {toolbar ? (
          <div className="bst:shrink-0 bst:border-b bst:border-border bst:bg-muted/30 bst:px-5 bst:py-3">
            {toolbar}
          </div>
        ) : null}
        <OverlayBody className="bld-panel bst:flex-1 bst:overflow-y-auto">{children}</OverlayBody>
      </DrawerPanel>
    </Overlay>
  );
}
