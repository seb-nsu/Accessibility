// Vorlage: Barrierefreiheits-Lint für React/Next.js (ESLint Flat Config).
// In das Zielprojekt kopieren und mit der bestehenden eslint.config.mjs zusammenführen.
//   npm i -D eslint eslint-plugin-jsx-a11y
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    files: ['**/*.{jsx,tsx}'],
    ...jsxA11y.flatConfigs.strict,
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      // Supertest-Katalog: diese Regeln blockieren den Build
      'jsx-a11y/alt-text': 'error', //                         1.1.1
      'jsx-a11y/label-has-associated-control': 'error', //     1.3.1 / 3.3.2
      'jsx-a11y/click-events-have-key-events': 'error', //     2.1.1
      'jsx-a11y/no-static-element-interactions': 'error', //   2.1.1 / 4.1.2
      'jsx-a11y/no-noninteractive-tabindex': 'error', //       2.4.3
      'jsx-a11y/tabindex-no-positive': 'error', //             2.4.3
      'jsx-a11y/anchor-is-valid': 'error', //                  2.1.1 / 4.1.2
      'jsx-a11y/anchor-has-content': 'error', //               2.4.4
      'jsx-a11y/media-has-caption': 'error', //                1.2.2
      'jsx-a11y/no-autofocus': 'warn', //                      3.2.1
      'jsx-a11y/autocomplete-valid': 'error', //               1.3.5
      'jsx-a11y/html-has-lang': 'error', //                    3.1.1
      'jsx-a11y/aria-props': 'error', //                       4.1.2
      'jsx-a11y/aria-role': 'error', //                        4.1.2
      'jsx-a11y/role-has-required-aria-props': 'error', //     4.1.2
    },
  },
];
