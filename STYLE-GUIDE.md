# Style guide

Conventions actually used in this repository. Rules below are derived from the
existing `.prettierrc.json`, `eslint.config.js`, and the files already in
`src/`. If you want to change a rule, update the config first — don't
freelance.

## Formatting (Prettier)

Source: `.prettierrc.json`.

- **Quotes:** single quotes for JS/TS strings. JSX attribute strings keep
  Prettier's default (double quotes inside JSX).
- **Semicolons:** required. `semi: true`.
- **Line width:** 100 columns.
- **Indentation:** two spaces, no tabs.
- **Trailing commas:** everywhere Prettier allows (`trailingComma: "all"`).
- **Arrow parens:** always (`(x) => x`, never `x => x`).
- **Line endings:** LF.

Run Prettier via your editor or invoke it directly with
`npx prettier --check .`.

## Linting (ESLint)

Source: `eslint.config.js`. Notable project-specific rules:

- `src/pureLogic/**` is framework-free. ESLint blocks imports from `react`,
  `react-dom`, `vite`, and references to the `window` / `document` globals
  from this directory. Keep Layer 1 pure.
- Unused variables warn unless prefixed with `_`.

Run with `npm run lint`.

## Imports

Observed grouping in UI and app files (e.g. `src/ui/ReelGrid.tsx`,
`src/ui/BottomBar.tsx`, `src/app/App.tsx`). Groups are separated by a single
blank line, in this order:

1. External packages (`react`, `react-dom`, etc.).
2. Cross-layer types — `import type { ... } from '../types/...'`.
3. Cross-layer values — `../pureLogic/...`, `../theme/...`, other `../ui/...`.
4. Sibling modules (same directory): the component's CSS module import and any
   local helpers.

`import type` is used whenever only types cross the boundary. This matters for
`src/pureLogic/**` files consumed by UI — value imports would pull runtime
code, type imports erase at build.

## TSDoc and comments

Block-level file headers use `//` line comments, not `/** */`. Files open with
a short block describing the chunk ID (`// P14 — ...`), the component's role,
and any spec references (`§10.1`, `§9.2`) pointing back to
`strategyDocs/game_design.md`.

Exported symbols get a `/** ... */` JSDoc block. Typical shape:

```ts
/** Legal line-bet ladder, mirrors P08's `BET_LEVELS` (§9.2). */
export const BET_LADDER: readonly BetLevel[] = [1, 2, 5, 10, 25, 50, 100];
```

Most exports carry only a description — explicit `@param` / `@returns` tags
are rare and only appear when a parameter needs clarification beyond its
type. Inline `//` comments inside function bodies explain *why* something is
done a specific way, never *what* it does.

## React component file layout

Observed in `src/ui/*.tsx`:

1. Imports (grouped as above).
2. CSS module import: `import styles from './Foo.module.css';` — last import.
3. File-level block comment: chunk ID, purpose, spec references.
4. Module-scope constants (e.g. `REEL_COUNT`, `BET_LADDER`). Exported when
   shared with tests.
5. Exported types and interfaces (`FooProps`, etc.).
6. The primary component as a named `export function`. Default exports are
   only used for the root `App` shell.
7. Sub-components and helpers below the primary component, in the order
   they're referenced.

Components are function components using hooks. No classes. Props are typed
with an explicit `interface FooProps` (not inline).

## Test naming

Source: `src/__tests__/*.test.ts`.

- One test file per module, matching the module name in lowerCamelCase:
  `wallet.ts` → `wallet.test.ts`.
- Vitest imports: `import { describe, it, expect } from 'vitest';`.
- `describe` blocks name the module or behaviour group and often include the
  spec section reference: `describe('wallet constants (§9.1, §9.2)', ...)`.
- `it` blocks use full sentences in the present tense describing the expected
  behaviour: `it('exposes the exact bet ladder [1, 2, 5, 10, 25, 50, 100]',
  ...)`.

Playwright e2e specs live in `tests/e2e/*.spec.ts`, use `test.describe` /
`test`, and prefer semantic selectors (`getByRole`, `getByLabel`,
`getByText`). CSS-class selectors are banned — they rot with styling changes.

## Commit messages

Observed in `git log`. Format: `<CHUNK-IDS> done` for feature chunks,
e.g. `P24 done` or `P02, P08, P14, P15, P16, P19, P21 done`. One chunk per
commit is preferred; grouped commits are acceptable when the chunks were
developed together. Non-chunk commits use short imperative subjects
(`Update game_design.md`, `Add low-fi wireframe`).
