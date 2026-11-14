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
  muted: 'bg-muted',
  card: 'bg-card',
  inverted: 'bg-foreground text-background [&_.text-muted-foreground]:text-background/75',
  primary:
    'bg-primary text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/80',
  image: 'bg-foreground bg-cover bg-center text-white [&_.text-muted-foreground]:text-white/80',
} as const;

const SECTION_PADDING = {
  none: 'py-0',
  xs: 'py-4',
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-16 sm:py-20',
  xl: 'py-20 sm:py-28',
  '2xl': 'py-28 sm:py-36',
} as const;

const WIDTH = {
  prose: 'max-w-measure',
  wide: 'max-w-5xl',
  full: 'max-w-none',
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
      'my-10 rounded-card px-5 sm:px-8',
      SECTION_BACKGROUND[props.background],
      SECTION_PADDING[props.paddingY],
    ),
  );
  return (
    <section {...merged} style={{ ...image, ...frame.style }}>
      <div className={cn('mx-auto w-full', WIDTH[props.width])}>{children}</div>
    </section>
  );
}

export function ContainerView({
  props,
  frame,
  children,
}: ElementRenderProps<PropsOf<typeof containerElement>>) {
  return <div {...frameProps(frame, cn('mx-auto w-full', WIDTH[props.width]))}>{children}</div>;
}

const GAP = { sm: 'gap-4', md: 'gap-6', lg: 'gap-10' } as const;
const V_ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

/** Stacked below the breakpoint, a 12-column grid from it. */
const COLUMNS_GRID = {
  mobile: {
    normal: 'grid grid-cols-1 sm:grid-cols-12',
    reverse: 'flex flex-col-reverse sm:grid sm:grid-cols-12',
  },
  tablet: {
    normal: 'grid grid-cols-1 lg:grid-cols-12',
    reverse: 'flex flex-col-reverse lg:grid lg:grid-cols-12',
  },
  never: { normal: 'grid grid-cols-12', reverse: 'grid grid-cols-12' },
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
          'my-8',
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
    'sm:col-span-1',
    'sm:col-span-2',
    'sm:col-span-3',
    'sm:col-span-4',
    'sm:col-span-5',
    'sm:col-span-6',
    'sm:col-span-7',
    'sm:col-span-8',
    'sm:col-span-9',
    'sm:col-span-10',
    'sm:col-span-11',
    'sm:col-span-12',
  ],
  tablet: [
    '',
    'lg:col-span-1',
    'lg:col-span-2',
    'lg:col-span-3',
    'lg:col-span-4',
    'lg:col-span-5',
    'lg:col-span-6',
    'lg:col-span-7',
    'lg:col-span-8',
    'lg:col-span-9',
    'lg:col-span-10',
    'lg:col-span-11',
    'lg:col-span-12',
  ],
  never: [
    '',
    'col-span-1',
    'col-span-2',
    'col-span-3',
    'col-span-4',
    'col-span-5',
    'col-span-6',
    'col-span-7',
    'col-span-8',
    'col-span-9',
    'col-span-10',
    'col-span-11',
    'col-span-12',
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
    <div {...frameProps(frame, cn('flex min-w-0 flex-col', SPAN[stackOn][span] ?? ''))}>
      {children}
    </div>
  );
}

const GROUP_GAP = { none: 'gap-0', sm: 'gap-3', md: 'gap-5', lg: 'gap-8' } as const;
const GROUP_ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
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
          'my-6 flex',
          props.direction === 'horizontal' ? 'flex-row' : 'flex-col',
          props.direction === 'horizontal' && props.wrap && 'flex-wrap',
          GROUP_GAP[props.gap],
          GROUP_ALIGN[props.align],
          // Children of a group do not carry their own outer margins — the
          // gap is the spacing.
          '[&>*]:my-0',
        ),
      )}
    >
      {children}
    </div>
  );
}

const SPACER = {
  none: 'h-0',
  xs: 'h-2',
  sm: 'h-4',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-20',
  '2xl': 'h-32',
} as const;

export function SpacerView({ props, frame }: ElementRenderProps<PropsOf<typeof spacerElement>>) {
  return <div aria-hidden="true" {...frameProps(frame, SPACER[props.size])} />;
}

const DIVIDER_WIDTH = { short: 'mx-auto w-16', medium: 'mx-auto w-1/2', full: 'w-full' } as const;

export function DividerView({ props, frame }: ElementRenderProps<PropsOf<typeof dividerElement>>) {
  if (props.variant === 'dots' || props.variant === 'ornament') {
    return (
      <div
        role="separator"
        {...frameProps(
          frame,
          cn(
            'text-muted-foreground my-10 flex items-center justify-center gap-3',
            DIVIDER_WIDTH[props.width],
          ),
        )}
      >
        {props.variant === 'dots' ? (
          <>
            <span className="size-1 rounded-full bg-current" />
            <span className="size-1 rounded-full bg-current" />
            <span className="size-1 rounded-full bg-current" />
          </>
        ) : (
          <>
            <span className="bg-border h-px flex-1" />
            <span className="border-primary size-2 rotate-45 border" />
            <span className="bg-border h-px flex-1" />
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
          'border-border my-10 border-t',
          props.variant === 'dashed' && 'border-dashed',
          DIVIDER_WIDTH[props.width],
        ),
      )}
    />
  );
}
