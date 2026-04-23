# DATA HEIST

DATA HEIST is a cyberpunk-themed 5-reel slot machine prototype built in
TypeScript, React 18, and Vite. The player spins a neon grid of sixteen
symbols — fruit low-pays, chrome mid-pays, and high-pay glyphs like the Neon 7,
Katana, and Gold Kanji — against a persistent virtual wallet.

The framing is a netrunner's raid on a "data vault": each spin is a pulse of
light through the grid, wins surface as tiered celebrations, and the top bar
carries a decorative ticker of Chip / Disk / Vault / Mainframe jackpot totals.
This repository is v0.1.0, a deliberate vertical slice of the larger plan
documented in [`strategyDocs/ai-prompts.md`](strategyDocs/ai-prompts.md).

## DEMO MODE

> **This is a demo prototype. No real money is involved. No purchases are
> processed. All credits are virtual.**

The wallet uses synthetic credits (CC) that persist only to the player's
local browser storage. There is no back end, no payment integration, and no
user account.

## Current scope (v0.1.0)

What actually works in this build:

- 5×3 reel grid with 16 cyberpunk symbols (13 paying + wild / scatter / bonus).
- 25 fixed paylines with left-to-right evaluation (minimum 3-of-a-kind from
  reel 1).
- 7-level bet system (1, 2, 5, 10, 25, 50, 100 CC per line; 25–2,500 CC total).
- Persistent wallet backed by `localStorage`, starting balance 10,000 CC.
- Tiered win celebrations (small / medium / big / mega / epic) with scaled
  overlay durations.
- Decorative jackpot ticker in the top bar, rotating through four tier labels
  every 3 seconds. Values are hardcoded and do not tick live.
- Paytable, Daily Bonus, Achievements, and VIP screens reachable from the menu
  drawer. All four consume static mock data.
- Vitest unit suite covering pure logic and UI modules (238 tests across 14
  files).
- Playwright e2e suite covering core flows (17 tests across 8 spec files).

## Deferred to v0.2

The items below are planned in `ai-prompts.md` but intentionally not
implemented in this release. They are not abandoned — the Layer 0 types and
stores were built to accept them without rework.

- Cascading reels (P03)
- Free spins bonus mode (P04)
- Wild respin mechanic (P05)
- Heist pick-em mini-game (P06)
- Live progressive jackpot counters (P07)
- Auto-spin and responsible-play caps (P11)
- Age gate (P12) — required before any public release
- Privacy mode (P13)
- In-app purchase mock UI (P17)
- Heist mini-game UI (P18)
- Audio system (P20)
- Settings / history / full menu drawer (P22)
- Real progression / achievement / VIP backend (P09, P10 — currently mocked in
  P21's UI)
- Lint / docs pass and clean-code audit (P25, P26)

## Quickstart

Prerequisites: Node.js 18 or later, npm.

```sh
git clone <this-repository-url>
cd Tech-Warmup-II-Better-Slot-Machine
npm install
npm run dev
```

The Vite dev server prints a local URL (default `http://localhost:5173`).
Open it in a browser and the game mounts immediately — there is no age gate
or onboarding flow in this scope.

## Test commands

```sh
npm test         # Vitest unit suite (pure logic + UI)
npm run e2e      # Playwright end-to-end suite (Chromium)
npm run lint     # ESLint
```

`npm run e2e` boots its own dev server if one is not already running. For a
headed debug run, use `npm run e2e:headed`. Documentation lint (if
`markdownlint-cli` is installed) is available via `npm run lint:md`.

## Architecture overview

The codebase follows a four-layer plan laid out in `ai-prompts.md`:

- **Layer 0** — shared types (`src/types/`) and theme tokens (`src/theme/`).
  No logic, no dependencies on anything above.
- **Layer 1** — pure logic (`src/pureLogic/`). Framework-free, DOM-free
  modules for the wallet, RNG, reel strips, paylines, paytable, and win
  evaluation. ESLint bans React / Vite / `window` / `document` imports from
  this layer.
- **Layer 2** — presentational UI (`src/ui/`). React components that read
  state from Layer 1 stores and render it. Components do not own
  orchestration.
- **Layer 3** — integration (`src/app/`). The `App` shell and
  `GameController` wire the wallet, RNG, and UI into a playable loop.

The full 28-chunk plan lives in
[`strategyDocs/ai-prompts.md`](strategyDocs/ai-prompts.md). The architecture
is designed so deferred chunks can be added without rewriting existing code.

## File tree

```text
src/
  types/       Layer 0: shared TypeScript interfaces.
  theme/       Layer 0: palette, durations, symbol asset paths.
  pureLogic/   Layer 1: wallet, RNG, reels, paylines, evaluate.
  ui/          Layer 2: React components (reel grid, bars, overlays, screens).
  app/         Layer 3: App shell and GameController.
```

Unit tests live in `src/__tests__/`; e2e specs live in `tests/e2e/`.

## Roadmap to v0.2

Priority order for the next milestone:

1. **Age gate (P12)** — shipping requirement for any public release.
2. **Audio (P20)** — the single biggest "feel" gap; wins currently land
   silently.
3. **Free spins (P04)** — the most-requested slot bonus mode.
4. **Purchase store UI (P17)** — demo-mode banner and pack-select flow.

## Credits and license

Built as a CSE 110 Tech-Warmup-II exercise by Group 7. Symbol art, audio, and
copy are prototype placeholders only. No license file is shipped with v0.1.0;
the repository is provided as-is for coursework review.
