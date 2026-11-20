/** The free canvas: see README.md. */
export { FreeStage } from './stage';
export { FreeLayersPanel, type FreeLayersPanelProps } from './layers';
export {
  FreeArrange,
  FreeLayoutFields,
  type FreeArrangeProps,
  type FreeLayoutFieldsProps,
} from './arrange';
export { useFreeCommands, type FreeCommands, type FreeRestack } from './commands';
export { alignNodes, distributeNodes, moveFramesBy, placeNewNodes, writeFrame } from './operations';
export {
  formatNumber,
  formatUnit,
  intersects,
  resizeFrame,
  rotateFrom,
  roundFrame,
  snapAxis,
  unionBounds,
  type ResizeOptions,
  type SnapHit,
} from './geometry';
export type {
  FreeAlign,
  FreeArtboard,
  FreeBoard,
  FreeFrame,
  FreeHandle,
  FreeRect,
  FreeRenderArgs,
  FreeSize,
  FreeSizeOf,
  FreeStageProps,
  FreeUnit,
} from './types';
export {
  frameBounds,
  frameOf,
  freeFrameSchema,
  isPlaced,
  normalizeAngle,
  UNPLACED_FRAME,
} from '../../core';
