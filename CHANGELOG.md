# Changelog

All notable changes to DATA HEIST are documented in this file. Entries follow
the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format, grouped
by release.

## [0.1.0] — 2026-04-22

First tagged release. A deliberate vertical slice of the larger plan in
`strategyDocs/ai-prompts.md` — a functional, spinnable slot machine with
persistent wallet, unit + e2e tests, and mock-data retention screens.

### Added

- Core spin mechanic: shared types, RNG, reel strips, paylines, paytable, win
  evaluation, and persistent wallet (P00, P01, P02, P08).
- Reel grid, bet controls, top and bottom bars (P14, P15, P16).
- Tiered win celebrations — small, medium, big, mega, epic (P19).
- Paytable, Daily Bonus, Achievements, and VIP screens backed by mock data
  (P21).
- Game loop integration: `GameController` wires wallet, RNG, and UI into a
  playable app (P23).
- Playwright e2e test suite: 17 tests across 8 spec files covering bootstrap,
  spin, betting, win flow, paytable, menu screens, persistence, and the top
  bar ticker (P24).

### Deferred to v0.2

- Cascading reels (P03)
- Free spins bonus mode (P04)
- Wild respin mechanic (P05)
- Heist pick-em mini-game (P06)
- Live progressive jackpot counters (P07)
- Real progression and achievement backend (P09)
- Real VIP backend (P10)
- Auto-spin and responsible-play caps (P11)
- Age gate (P12)
- Privacy mode (P13)
- In-app purchase mock UI (P17)
- Heist mini-game UI (P18)
- Audio system (P20)
- Settings, history, and full menu drawer (P22)
- Clean-code audit and lint pass (P25)
- Documentation polish (P26)

### Known limitations

- No audio: the game is silent. Win celebrations fire without cues.
- No bonus modes: scatters and bonus symbols land on the grid and are counted,
  but do not trigger free spins or the heist mini-game.
- Jackpot ticker values are decorative. The four tier totals (Chip, Disk,
  Vault, Mainframe) rotate on a 3-second interval but do not tick up.
- Paytable, Daily Bonus, Achievements, and VIP screens render static mock
  data. Progress, claim state, and VIP tier do not change with play.
- No age gate. Not suitable for public release in its current state.
