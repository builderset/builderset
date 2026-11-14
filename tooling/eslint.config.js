import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * The packages' boundaries (docs/plan/steps/03_SPLIT_ENGINE_FROM_ARTICLE.md):
 * the engine knows no kit, a kit knows no other kit, a `core` folder knows no
 * React and no `render` or `editor`, and a `render` folder knows no `editor`.
 *
 * In a flat config a later block REPLACES an earlier block's options for the
 * same rule, so each package-and-folder pair gets one rule with every
 * restriction that applies to it.
 */
/**
 * No framework: a package that imports Next.js cannot be installed in a Vite
 * or Remix app. The editor has its own UI kit (`@builderset/engine/ui`) and its
 * own words (`EditorMessages`).
 */
const NO_FRAMEWORK =
  'A package may not depend on Next.js: it has to work in any React app. Use @builderset/engine/ui and EditorMessages.';

const KITS = {
  engine: ['@builderset/article', '@builderset/email'],
  article: ['@builderset/email'],
  email: ['@builderset/article'],
};
const LAYERS = {
  core: {
    paths: ['react', 'react-dom'],
    folders: ['render', 'editor'],
  },
  render: { paths: [], folders: ['editor'] },
  editor: { paths: [], folders: [] },
  // The engine's host entry: the editor's contract with a backend, usable
  // from a server or a test.
  host: {
    paths: ['react', 'react-dom'],
    folders: ['render', 'editor'],
  },
};
const packageBoundaries = Object.entries(KITS).flatMap(([pkg, otherKits]) =>
  Object.entries(LAYERS).map(([layer, { paths, folders }]) => ({
    files: [`packages/${pkg}/src/${layer}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...paths.map((name) => ({
              name,
              message: `A ${layer} folder renders nothing: no React here.`,
            })),
            { name: 'next', message: NO_FRAMEWORK },
          ],
          patterns: [
            { group: ['next/*'], message: NO_FRAMEWORK },
            ...(otherKits.length
              ? [
                  {
                    group: otherKits.flatMap((kit) => [kit, `${kit}/*`]),
                    message:
                      pkg === 'engine'
                        ? 'The engine knows no kit: move this into the kit, or make the engine generic.'
                        : 'A kit does not import another kit.',
                  },
                ]
              : []),
            ...(folders.length
              ? [
                  {
                    group: folders.flatMap((folder) => [
                      `**/${folder}`,
                      `**/${folder}/*`,
                      `@builderset/*/${folder}`,
                    ]),
                    message: `A ${layer} folder may not import ${folders.join(' or ')}.`,
                  },
                ]
              : []),
          ],
        },
      ],
    },
  })),
);

/**
 * Flat config — ESLint 10 supports nothing else. Every package uses it: the
 * root `eslint.config.js` re-exports it, and ESLint finds that file from any
 * package's folder.
 */
export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // A backend speaks snake_case and the documents cross the wire unchanged
      // (`expected_saved_at`), so property names are exempt from camelCase.
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
        { selector: 'variable', format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'import', format: null },
        // PascalCase is allowed because a COMPONENT passed as a prop is
        // PascalCase by React convention — `{ icon: TileIcon }` — and a
        // destructured prop is a `parameter` as far as this rule is concerned.
        {
          selector: 'parameter',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
      ],
    },
  },
  ...packageBoundaries,
);
