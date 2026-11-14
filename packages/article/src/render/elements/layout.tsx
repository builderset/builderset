import { parentOf, type PropsOf } from '@builderset/engine';
import {
  COLUMN_LAYOUTS,
  type columnElement,
  type columnsElement,
  type containerElement,
  type dividerElement,
  type groupElement,
  type sectionElement,
  type spacerElement,
} from '../../core/elements/layout';
import { cn } from '../cn';
import type { ElementRenderProps } from '../context';
import { frameProps } from '../parts';

/**
 * Layout. Every class below is a literal — Tailwind must be able to find it —
 * which is why the token → class maps are written out rather than built.
 */

const SECTION_BACKGROUND = {
  none: '',
  muted: 'bst:bg-muted',
  card: 'bst:bg-card',
  inverted:
    'bst:bg-foreground bst:text-background bst:[&_[class~="bst:text-muted-foreground"]]:text-background/75',
  primary:
    'bst:bg-primary bst:text-primary-foreground bst:[&_[class~="bst:text-muted-foreground"]]:text-primary-foreground/80',
  image:
    'bst:bg-foreground bst:bg-cover bst:bg-center bst:text-white bst:[&_[class~="bst:text-muted-foreground"]]:text-white/80',
} as const;

const SECTION_PADDING = {
  none: 'bst:py-0',
  xs: 'bst:py-4',
  sm: 'bst:py-8',
  md: 'bst:py-12',
  lg: 'bst:py-16 bst:sm:py-20',
  xl: 'bst:py-20 bst:sm:py-28',
  '2xl': 'bst:py-28 bst:sm:py-36',
} as const;

const WIDTH = {
  prose: 'bst:max-w-measure',
  wide: 'bst:max-w-5xl',
  full: 'bst:max-w-none',
} as const;

export function SectionView({
  props,
  frame,
  children,
  context,
}: ElementRenderProps<PropsOf<typeof sectionElement>>) {
  const image =
    props.background === 'image' && props.image
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,${String(props.overlay / 100)}), rgba(0,0,0,${String(props.overlay / 100)})), url("${encodeURI(context.options.resolveMedia(props.image.key))}")`,
        }
      : undefined;
  const merged = frameProps(
    frame,
    cn(
      'bst:my-10 bst:rounded-card bst:px-5 bst:sm:px-8',
      SECTION_BACKGROUND[props.background],
      SECTION_PADDING[props.paddingY],
    ),
  );
  return (
    <section {...merged} style={{ ...image, ...frame.style }}>
      <div className={cn('bst:mx-auto bst:w-full', WIDTH[props.width])}>{children}</div>
    </section>
  );
}

export function ContainerView({
  props,
  frame,
  children,
}: ElementRenderProps<PropsOf<typeof containerElement>>) {
  return (
    <div {...frameProps(frame, cn('bst:mx-auto bst:w-full', WIDTH[props.width]))}>{children}</div>
  );
}

const GAP = { sm: 'bst:gap-4', md: 'bst:gap-6', lg: 'bst:gap-10' } as const;
const V_ALIGN = {
  start: 'bst:items-start',
  center: 'bst:items-center',
  end: 'bst:items-end',
  stretch: 'bst:items-stretch',
} as const;

/** Stacked below the breakpoint, a 12-column grid from it. */
const COLUMNS_GRID = {
  mobile: {
    normal: 'bst:grid bst:grid-cols-1 bst:sm:grid-cols-12',
    reverse: 'bst:flex bst:flex-col-reverse bst:sm:grid bst:sm:grid-cols-12',
  },
  tablet: {
    normal: 'bst:grid bst:grid-cols-1 bst:lg:grid-cols-12',
    reverse: 'bst:flex bst:flex-col-reverse bst:lg:grid bst:lg:grid-cols-12',
  },
  never: { normal: 'bst:grid bst:grid-cols-12', reverse: 'bst:grid bst:grid-cols-12' },
} as const;

export function ColumnsView({
  props,
  frame,
  children,
}: ElementRenderProps<PropsOf<typeof columnsElement>>) {
  return (
    <div
      {...frameProps(
        frame,
        cn(
          'bst:my-8',
          COLUMNS_GRID[props.stackOn][props.reverseOnStack ? 'reverse' : 'normal'],
          GAP[props.gap],
          V_ALIGN[props.verticalAlign],
        ),
      )}
    >
      {children}
    </div>
  );
}

const SPAN = {
  mobile: [
    '',
    'bst:sm:col-span-1',
    'bst:sm:col-span-2',
    'bst:sm:col-span-3',
    'bst:sm:col-span-4',
    'bst:sm:col-span-5',
    'bst:sm:col-span-6',
    'bst:sm:col-span-7',
    'bst:sm:col-span-8',
    'bst:sm:col-span-9',
    'bst:sm:col-span-10',
    'bst:sm:col-span-11',
    'bst:sm:col-span-12',
  ],
  tablet: [
    '',
    'bst:lg:col-span-1',
    'bst:lg:col-span-2',
    'bst:lg:col-span-3',
    'bst:lg:col-span-4',
    'bst:lg:col-span-5',
    'bst:lg:col-span-6',
    'bst:lg:col-span-7',
    'bst:lg:col-span-8',
    'bst:lg:col-span-9',
    'bst:lg:col-span-10',
    'bst:lg:col-span-11',
    'bst:lg:col-span-12',
  ],
  never: [
    '',
    'bst:col-span-1',
    'bst:col-span-2',
    'bst:col-span-3',
    'bst:col-span-4',
    'bst:col-span-5',
    'bst:col-span-6',
    'bst:col-span-7',
    'bst:col-span-8',
    'bst:col-span-9',
    'bst:col-span-10',
    'bst:col-span-11',
    'bst:col-span-12',
  ],
} as const;

export function ColumnView({
  node,
  props,
  frame,
  children,
  context,
}: ElementRenderProps<PropsOf<typeof columnElement>>) {
  // The span answers to the PARENT's breakpoint and preset: a preset layout
  // decides the widths; "custom" uses each column's own span.
  const parent = parentOf(context.document, node.id);
  const columns = parent?.props as PropsOf<typeof columnsElement> | undefined;
  const stackOn = columns?.stackOn ?? 'mobile';
  let span = props.span;
  if (columns && columns.layout !== 'custom') {
    const index = parent?.children?.indexOf(node.id) ?? -1;
    span = COLUMN_LAYOUTS[columns.layout][index] ?? span;
  }
  return (
    <div {...frameProps(frame, cn('bst:flex bst:min-w-0 bst:flex-col', SPAN[stackOn][span] ?? ''))}>
      {children}
    </div>
  );
}

const GROUP_GAP = { none: 'bst:gap-0', sm: 'bst:gap-3', md: 'bst:gap-5', lg: 'bst:gap-8' } as const;
const GROUP_ALIGN = {
  start: 'bst:items-start',
  center: 'bst:items-center',
  end: 'bst:items-end',
  stretch: 'bst:items-stretch',
} as const;

export function GroupView({
  props,
  frame,
  children,
}: ElementRenderProps<PropsOf<typeof groupElement>>) {
  return (
    <div
      {...frameProps(
        frame,
        cn(
          'bst:my-6 bst:flex',
          props.direction === 'horizontal' ? 'bst:flex-row' : 'bst:flex-col',
          props.direction === 'horizontal' && props.wrap && 'bst:flex-wrap',
          GROUP_GAP[props.gap],
          GROUP_ALIGN[props.align],
          // Children of a group do not carry their own outer margins — the
          // gap is the spacing.
          'bst:[&>*]:my-0',
        ),
      )}
    >
      {children}
    </div>
  );
}

const SPACER = {
  none: 'bst:h-0',
  xs: 'bst:h-2',
  sm: 'bst:h-4',
  md: 'bst:h-8',
  lg: 'bst:h-12',
  xl: 'bst:h-20',
  '2xl': 'bst:h-32',
} as const;

export function SpacerView({ props, frame }: ElementRenderProps<PropsOf<typeof spacerElement>>) {
  return <div aria-hidden="true" {...frameProps(frame, SPACER[props.size])} />;
}

const DIVIDER_WIDTH = {
  short: 'bst:mx-auto bst:w-16',
  medium: 'bst:mx-auto bst:w-1/2',
  full: 'bst:w-full',
} as const;

export function DividerView({ props, frame }: ElementRenderProps<PropsOf<typeof dividerElement>>) {
  if (props.variant === 'dots' || props.variant === 'ornament') {
    return (
      <div
        role="separator"
        {...frameProps(
          frame,
          cn(
            'bst:my-10 bst:flex bst:items-center bst:justify-center bst:gap-3 bst:text-muted-foreground',
            DIVIDER_WIDTH[props.width],
          ),
        )}
      >
        {props.variant === 'dots' ? (
          <>
            <span className="bst:size-1 bst:rounded-full bst:bg-current" />
            <span className="bst:size-1 bst:rounded-full bst:bg-current" />
            <span className="bst:size-1 bst:rounded-full bst:bg-current" />
          </>
        ) : (
          <>
            <span className="bst:h-px bst:flex-1 bst:bg-border" />
            <span className="bst:size-2 bst:rotate-45 bst:border bst:border-primary" />
            <span className="bst:h-px bst:flex-1 bst:bg-border" />
          </>
        )}
      </div>
    );
  }
  return (
    <hr
      {...frameProps(
        frame,
        cn(
          'bst:my-10 bst:border-t bst:border-border',
          props.variant === 'dashed' && 'bst:border-dashed',
          DIVIDER_WIDTH[props.width],
        ),
      )}
    />
  );
}
