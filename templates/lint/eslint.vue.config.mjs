// Vorlage: Barrierefreiheits-Lint für Vue/Nuxt (ESLint Flat Config).
//   npm i -D eslint eslint-plugin-vue eslint-plugin-vuejs-accessibility
import vue from 'eslint-plugin-vue';
import vueA11y from 'eslint-plugin-vuejs-accessibility';

export default [
  ...vue.configs['flat/recommended'],
  ...vueA11y.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    rules: {
      'vuejs-accessibility/alt-text': 'error', //                      1.1.1
      'vuejs-accessibility/form-control-has-label': 'error', //        1.3.1 / 3.3.2
      'vuejs-accessibility/click-events-have-key-events': 'error', //  2.1.1
      'vuejs-accessibility/no-static-element-interactions': 'error', // 2.1.1
      'vuejs-accessibility/tabindex-no-positive': 'error', //          2.4.3
      'vuejs-accessibility/anchor-has-content': 'error', //            2.4.4
      'vuejs-accessibility/media-has-caption': 'error', //             1.2.2
      'vuejs-accessibility/no-autofocus': 'warn', //                   3.2.1
    },
  },
];
