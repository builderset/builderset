import { createArticleRegistry } from '@builderset/article';
import type { ElementRenderProps } from '@builderset/article/render';
import { defineElement, z } from '@builderset/engine';

// #region define
/** A project's own element: a price with its currency. Shared by the editor, the site and the server. */
export const priceTag = defineElement({
  type: 'price-tag',
  version: 1,
  category: 'plugin',
  icon: 'tag',
  keywords: ['price', 'cost'],
  schema: z.object({ amount: z.number().min(0), currency: z.string().length(3) }),
  defaults: () => ({ amount: 0, currency: 'EUR' }),
});
// #endregion define

// #region register
/** The standard elements and yours: give the same registry to the editor, the renderer and the server. */
// The cast is needed today: the parameter is typed for the kit's own list (see Known limits).
export const registry = createArticleRegistry([priceTag as never]);
// #endregion register

// #region render
/** How the site draws it: ArticleRenderer's `elements={{ 'price-tag': PriceTagView }}`. */
export function PriceTagView({ props }: ElementRenderProps<{ amount: number; currency: string }>) {
  return (
    <p className="price">
      {new Intl.NumberFormat('en', { style: 'currency', currency: props.currency }).format(
        props.amount,
      )}
    </p>
  );
}
// #endregion render
