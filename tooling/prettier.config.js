import { fileURLToPath } from 'node:url';

/**
 * One formatter for the whole workspace.
 *
 * @type {import("prettier").Config}
 */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,

  /**
   * Keep whatever line endings a file already has.
   *
   * Prettier defaults to 'lf' and FAILS `--check` on anything else. A Windows
   * checkout made before `.gitattributes` existed, or with an editor that
   * writes CRLF, would then report every file as misformatted and the check
   * would stop saying anything about formatting. Git stores LF regardless
   * (`.gitattributes`).
   */
  endOfLine: 'auto',
  // The classes are Tailwind's, under the product's prefix (bst:flex). The
  // plugin keeps them in one order so diffs show real changes; it learns the
  // prefix and the theme's names from the engine's stylesheet.
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: fileURLToPath(
    new URL('../packages/engine/src/theme/index.css', import.meta.url),
  ),
  tailwindFunctions: ['cn', 'clsx', 'cx', 'cva', 'twMerge'],
};
