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
  // The editor's classes are Tailwind's until step 10 compiles them; the
  // plugin keeps them in one order so diffs show real changes.
  plugins: ['prettier-plugin-tailwindcss'],
};
