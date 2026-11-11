/**
 * @motors/engine/ui — the editor's own UI kit.
 *
 * Copied from the first host app's UI kit on 2026-11-11 (Builderset plan, step 04)
 * with only their imports changed, so the editors look and behave as before
 * without depending on that app's design system. From here on the two are
 * separate code and drift apart on purpose: a fix in the app's kit does not
 * reach this kit.
 *
 * The class names still use the shadcn-style token names (`bg-card`,
 * `rounded-[var(--radius-control)]`); step 10 maps them to the product's own
 * variables. Every `data-slot` is kept: the side panels' dense layout targets
 * them (`chrome/panel-css.ts`).
 */

export { Badge, type BadgeProps, type BadgeTone } from './badge';
export { Button, buttonVariants, ICON_MOTION, type ButtonProps } from './button';
export { ConfirmDialog, type ConfirmDialogProps, type ConfirmTone } from './confirm-dialog';
export { DateTimeField, fromLocalInput, toLocalInput, type DateTimeFieldProps } from './date-time';
export {
  controlClass,
  Input,
  Textarea,
  TEXTAREA_MIN_ROWS,
  type InputProps,
  type TextareaProps,
} from './input';
export { Label } from './label';
export { useMediaQuery } from './media';
export {
  barButtonClass,
  DialogPanel,
  DrawerPanel,
  Overlay,
  OverlayBody,
  OverlayClose,
  OverlayDescription,
  OverlayFooter,
  OverlayHeader,
  OverlayTitle,
  OverlayTrigger,
  type DrawerPanelProps,
} from './overlay';
export { Progress, Skeleton, Spinner, type ProgressProps, type SpinnerProps } from './misc';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipProvider,
  type TooltipProps,
} from './popover';
export { PortalProvider, usePortalContainer } from './portal';
export { Select, type SelectOption, type SelectProps } from './select';
export { Sheet, SheetAction, SheetOption, type SheetOptionProps, type SheetProps } from './sheet';
export { EmptyState, type EmptyStateProps } from './states';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { ToggleFlag, type ToggleFlagProps } from './toggle-flag';
export {
  SegmentedControl,
  Switch,
  type SegmentedControlProps,
  type SegmentedOption,
} from './toggles';
