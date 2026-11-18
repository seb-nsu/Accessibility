# Lint-Vorlagen (Hebel 1: Fehler verhindern)

Diese Regeln greifen schon beim Schreiben im Editor und in der CI. Sie gehören in das **Projekt, das die Website baut**, nicht in dieses Test-Repository.

| Framework | Vorlage | Pakete |
| --- | --- | --- |
| React / Next.js | [`eslint.react.config.mjs`](eslint.react.config.mjs) | `eslint`, `eslint-plugin-jsx-a11y` |
| Vue / Nuxt | [`eslint.vue.config.mjs`](eslint.vue.config.mjs) | `eslint`, `eslint-plugin-vue`, `eslint-plugin-vuejs-accessibility` |
| Angular | siehe unten | `angular-eslint` |
| Svelte | eingebaut: der Svelte-Compiler meldet `a11y_*`-Warnungen; in der CI mit `svelte-check --fail-on-warnings` blockieren | – |

## Angular

In der `eslint.config.js` des Angular-Projekts für Templates:

```js
// npm i -D angular-eslint
const angular = require('angular-eslint');

module.exports = [
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
];
```

## Pre-Commit

Mit [lint-staged](https://github.com/lint-staged/lint-staged) nur geänderte Dateien prüfen:

```json
{ "lint-staged": { "*.{jsx,tsx,vue,html}": "eslint --max-warnings=0" } }
```

## Farb-Tokens

Kontrast (1.4.3, 1.4.11) am besten im Design-System absichern: Nur Text/Hintergrund-Paare mit mindestens 4,5:1 (großer Text und Bedienelemente 3:1) als Tokens freigeben. Dann ist der Kontrast für alle Seiten, die nur Tokens nutzen, bereits geprüft.

> Die Plugin-Namen und Konfigurationsschlüssel entsprechen dem Stand bei Erstellung. Vor dem Einsatz die aktuelle Dokumentation des jeweiligen Plugins prüfen.
