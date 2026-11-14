import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../cn';

/**
 * The product's only button.
 *
 * ── `destructive` is a TINT and `danger` is a FILL, deliberately ──────────────
 * A solid red button is the loudest thing on any screen it lands on, and the
 * commonest place a delete button appears is a table row — where it is not the
 * point of the screen and should not look like it. So `destructive` is a 10%
 * wash with a matching border.
 *
 * It carries that border even though the wash does not need one to be visible.
 * It needs one structurally: a confirm dialog stands it beside a cancel button
 * drawn with a border, and a borderless wash next to a bordered control does not
 * read as the same kind of object — it reads as the disabled one.
 *
 * `danger` is the same intent inside a modal that exists to ask ONE question.
 * There the tint reads as the disabled option next to a filled cancel, so the
 * confirm is a solid fill. Two names because they are two contexts, not because
 * anybody could not decide.
 *
 * ── `loading` ────────────────────────────────────────────────────────────────
 * Disabled AND `aria-busy`, with the label kept: swapping a label for a spinner
 * makes the button resize under the pointer that is still on it, which on a
 * footer action bar shifts every other control. The spinner takes the icon slot.
 */
/**
 * The icon's hover motion, shared by every button-shaped control.
 *
 * A small lift and tilt that springs back on leave — the same gesture the rail
 * makes, so a pointer gets one answer everywhere it lands. Transform only
 * (`scale` and `rotate` are their own properties in Tailwind 4), so it
 * composites and never nudges the label beside it. The spinner is excluded: it
 * is already moving, and a tilt on top of a spin reads as a wobble. Reduced
 * motion is handled once, globally, in the base layer.
 */
export const ICON_MOTION = cn(
  '[&_svg]:transition-[scale,rotate] [&_svg]:duration-(--bst-dur-3) [&_svg]:ease-enter',
  'hover:[&_svg:not(.animate-spin)]:scale-115 hover:[&_svg:not(.animate-spin)]:-rotate-8',
);

const button = cva(
  cn(
    'group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2',
    'rounded-control border border-transparent bg-clip-padding',
    'text-sm font-medium whitespace-nowrap select-none outline-none',
    // `bld-focus` rather than an offset outline, and the difference is not
    // cosmetic: every input and select in the product draws a 3px glow, and an
    // outline-plus-gap here meant a keyboard reader crossing from a field to the
    // button beside it watched the indicator change SHAPE. One treatment, stated
    // once in the theme stylesheet, is the whole reason that class exists.
    //
    // It also carries the transition, which is why there is no `transition-*`
    // utility here any more: `.bld-focus` is UNLAYERED and would have overridden
    // one anyway, so a utility beside it was a declaration that never applied.
    // The four properties it animates are the four this button changes; the
    // press nudge below is deliberately left instant.
    'bld-focus',
    // A press pushes the button down a pixel — except on a menu trigger, where
    // the surface stays put while its menu is open and a nudge would read as the
    // panel having moved rather than the button.
    '[&:active:not([aria-haspopup])]:translate-y-px',
    // `pointer-events-none` so a disabled button fires no hover styles and does
    // not swallow a click meant for what is behind it. Its COLOURS come from the
    // global disabled rule in the theme stylesheet — a surface, never an opacity
    // cascade that drags the label and the border below threshold with it.
    'disabled:pointer-events-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    ICON_MOTION,
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/85',
        // `aria-expanded:` on the three quiet variants: a button holding a menu
        // open is in a STATE, and leaving it to look at rest means the only mark
        // of an open dropdown is the dropdown itself — which on a crowded
        // toolbar is not enough to say which control opened it.
        secondary: cn(
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          'aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ),
        outline: cn(
          'border-border bg-input/40 text-foreground hover:border-border-strong hover:bg-input',
          'aria-expanded:border-border-strong aria-expanded:bg-input',
        ),
        ghost: 'text-foreground hover:bg-accent aria-expanded:bg-accent',
        destructive: cn(
          'border-destructive/25 bg-destructive/10 text-destructive',
          'hover:border-destructive/40 hover:bg-destructive/20',
        ),
        // The same tint construction as `destructive`, for the action that is
        // reversible but wants thinking about — a retry, a force-sync, a
        // publish over something already live.
        warning: cn('border-warn/25 bg-warn/10 text-warn', 'hover:border-warn/40 hover:bg-warn/20'),
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/85',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // `default` is `--control-h` — 36px, the height of every other control
        // in the back office. A button that is not that tall sits visibly proud
        // of the input beside it.
        default: 'h-9 px-3',
        sm: 'h-8 gap-1.5 px-2.5 text-[13px]',
        // 24px, for a control that lives INSIDE another object — a chip's
        // dismiss, a toolbar's overflow, an action in a table row. At this size
        // the icon comes down with the box, or a 16px glyph in a 24px square is
        // all glyph and no button.
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        // `md` and `lg` are the public site's scale: a marketing page's primary
        // action is the point of the screen and an operator tool's is not.
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-9 px-0',
        'icon-xs': "size-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 px-0',
        'icon-lg': 'size-10 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

type ButtonVariants = VariantProps<typeof button>;

export interface ButtonProps extends ComponentProps<'button'> {
  /**
   * The look: `primary`, `secondary`, `outline`, `ghost`, `destructive`,
   * `warning`, `danger` or `link`. Default: `'primary'`.
   */
  variant?: ButtonVariants['variant'];
  /**
   * The height: `default` (36px, every control's), `sm`, `xs` (inside another
   * object), `md` and `lg` (a site's scale), or a square `icon`, `icon-xs`,
   * `icon-sm`, `icon-lg`. Default: `'default'`.
   */
  size?: ButtonVariants['size'];
  /** Render as the child element — for a link that looks like a button. */
  asChild?: boolean;
  /** Shows a spinner in the icon's place, marks the button busy and disables it; the label stays. */
  loading?: boolean;
  /** Rendered before the label, and replaced by the spinner while loading. */
  icon?: ReactNode;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  icon,
  type,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      data-slot="button"
      data-variant={variant ?? 'primary'}
      // Without this a button inside a form submits it, which is the single most
      // common cause of an accidental double submission. Omitted under `asChild`
      // because the child is usually an anchor, which has no `type`.
      type={asChild ? undefined : (type ?? 'button')}
      // `disabled`, not merely `aria-disabled`: a loading button that can still
      // be pressed is the other way a form gets submitted twice.
      disabled={asChild ? undefined : (disabled ?? loading)}
      aria-busy={loading || undefined}
      className={cn(button({ variant, size }), className)}
      {...props}
    >
      {/* `Slot` renders exactly one child, so under `asChild` the caller owns the
          whole content and the icon slot is not ours to fill. */}
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : icon}
          {children}
        </>
      )}
    </Component>
  );
}

export { button as buttonVariants };
