# DATA HEIST — AI Generation Prompts

**Purpose:** A chunked, parallel-friendly implementation plan for the features specified in [`game_design.md`](./game_design.md), executed under the workflow described in [`ai-plan.md`](./ai-plan.md). Each chunk below is a self-contained instruction block an engineer can hand to Claude Code as a single prompt.

**How to use:**
1. Read P00 first — it pins the stack and shared contracts every other chunk depends on.
2. Generate P00 and commit.
3. After P00 is in, every other chunk (P01–P22) can be handed to a separate Claude Code session, on a separate branch, by a separate teammate, and worked on in parallel. Dependencies between chunks are resolved through the shared types/interfaces in P00, not through cross-chunk file edits.
4. After P23 integration lands, run the Layer 4 polish chunks (P24–P27) sequentially to close out the build.
5. Each chunk includes: **Scope · Contract · Requirements · Non-goals · Parallelism note · Acceptance**. Paste the whole block verbatim as the prompt.
6. Log every prompt execution using the template at the bottom of this doc.

**Target stack (pinned in P00):** TypeScript + React (Vite) for the app shell, zero framework for pure-logic modules (plain TS, no React imports) so they're testable in Node. Styling via CSS modules. Unit tests via Vitest. E2E tests via Playwright.

**Reference sections:** Every chunk cites the `game_design.md` section it implements. If a chunk conflicts with the design doc, the design doc wins — re-prompt with the corrected spec.

---

## Layer 0 — Foundation (must be first)

### P00 · Project scaffold, shared types, theme tokens

**Scope.** Initialize the repo, pin the stack, and author the shared type definitions and theme constants that every other chunk imports. This is the only prompt that must be completed before the others; once merged, P01–P22 are unblocked.

**Contract (create these exports, do not change names later).**
- `src/types/symbols.ts` — `SymbolId` union of the 16 symbol ids (`'cherry' | 'lime' | 'watermelon' | 'bar' | 'bell' | 'horseshoe' | 'clover' | 'diamond' | 'neon7' | 'katana' | 'cyberIris' | 'chromeSkull' | 'goldKanji' | 'wild' | 'scatter' | 'bonus'`), and `SymbolMeta` records with display name, cyberpunk framing, and tier (`'low' | 'mid' | 'high' | 'top' | 'special'`).
- `src/types/spin.ts` — `SpinInput { lineBet, totalBet, seed? }`, `SpinOutput { grid: SymbolId[5][3], wins: LineWin[], scatterWin, totalWin, triggers: { freeSpins?: number; heist?: boolean; wildRespin?: boolean; fixedJackpot?: boolean } }`, `LineWin { lineIndex, symbol, count, multiplier, credits }`.
- `src/types/bonus.ts` — discriminated-union `BonusState` for `base | freeSpins | heist | wildRespin | cascading`. Also export `HeistState`, `FreeSpinsState`, `WildRespinState`, `CascadeStep`, and `JackpotSnapshot` / `JackpotTier` as the canonical shapes every chunk uses.
- `src/types/economy.ts` — `Credits = number`, `PackId`, `BetLevel`, `VipTier`, `SessionStats`.
- `src/types/stores.ts` — **observable store interfaces** that every UI chunk mocks against: `WalletStore`, `JackpotCounter`, `ProgressionStore`, `AchievementsStore`, `VipStore`, `DailyBonusStore`, `PrivacyStore`, `ResponsiblePlayStore`. Each has `subscribe(cb): Unsubscribe`, a `getState(): TState` method, and its action signatures. UI code imports these interfaces; Layer-1 modules `implements` them. This is what makes parallel UI work safely — mocks match the interface, not a handshake with the implementer.
- `src/types/events.ts` — `GameEvent` discriminated union: `{ type: 'spin', result: SpinOutput } | { type: 'freeSpinsStart', count } | { type: 'freeSpinsEnd', totalWon } | { type: 'heistStart' } | { type: 'heistEnd', totalWon } | { type: 'jackpotHit', tier, amount } | { type: 'purchase', packId } | { type: 'highBetConfirmRequest', bet }`. Shared by P09, P11, and P23.
- `src/theme/tokens.ts` — palette (`#FF2D78` magenta paylines, `#C8FF00` neon yellow-green spin button, `#1A1528` card bg, `#FFFFFF` primary text), spacing scale, z-index scale, animation durations (`winTier: { small: 500, medium: 1200, big: 2500, mega: 4500, epic: 8000 }`).
- `src/theme/symbolAssets.ts` — an asset manifest: for each `SymbolId`, the paths to idle/win/dissolve art. Leave paths pointing at `/assets/symbols/<id>.png` placeholders; assets ship separately.

**Requirements.**
- Vite + React + TypeScript, strict mode on.
- ESLint + Prettier configured per `ai-plan.md` checklist.
- Vitest configured; `npm test` runs.
- `src/pureLogic/` directory must NOT import anything from React, DOM, or Vite. Add an ESLint rule enforcing this.
- Create empty placeholder files for each Layer 1 module (listed in P01–P09) exporting `export {}` so parallel branches don't collide on file creation.

**Non-goals.** No game logic. No UI. Just scaffolding and contracts.

**Acceptance.** `npm run dev`, `npm run build`, `npm test`, `npm run lint` all succeed. All type exports are importable from other files.

---

## Layer 1 — Pure logic modules (parallel, no UI, no DOM)

Every chunk in this layer lives under `src/pureLogic/` and must be unit-testable in Node without a DOM. They consume and produce the shared types from P00.

### P01 · RNG + reel strip engine

**Scope.** Implement the core spin primitive per `game_design.md` §2 and §8.2. Generates a 5×3 grid of `SymbolId`s by drawing from weighted reel strips.

**Contract.**
- `src/pureLogic/rng.ts` — `createRng(seed?: number): () => number` returning a seeded PRNG (use mulberry32 or xoshiro128**; do NOT use `Math.random`). Also export `cryptoSeed(): number` that wraps `crypto.getRandomValues`.
- `src/pureLogic/reels.ts` — `const REEL_STRIPS: SymbolId[][]` (5 arrays), and `spinReels(rng): SymbolId[5][3]`. The grid is `grid[reel][row]`, reels 0–4 left-to-right, rows 0–2 top-to-bottom.

**Requirements.**
- **Wilds appear only on reels 1, 2, and 3 (0-indexed)**; reels 0 and 4 must contain zero wilds. §5.1 states the rule in 1-indexed terms as "reels 2, 3, 4" — these are the same three middle reels.
- **Bonus appears only on reels 0, 2, and 4 (0-indexed)**; reels 1 and 3 must contain zero bonus symbols. §5.3 states this in 1-indexed terms as "reels 1, 3, 5" — same reels.
- Document each reel strip's length and symbol counts inline in a `// weights` block.
- Seed weights to approximate the target hit frequencies in §8.1: ~28% hit rate, ~1 in 150 scatter trigger, ~1 in 250 bonus trigger, ~1 in 1,000,000 five-Gold-Kanji. Exact RTP tuning is §18.2's open item — ship a reasonable first pass with a `// TODO: tune to 96% RTP` comment.
- Every spin is fully independent. No "due for a win" logic. No session-history modulation. This is a hard constraint from §17.1.

**Non-goals.** No payline evaluation. No animations. No balance changes.

**Parallelism note.** P02 imports `SymbolId[5][3]` from P00 types and mocks the grid in tests; no need to wait for P01.

**Acceptance.** Unit tests show: (a) seeded RNG is deterministic, (b) reel 0 has no wilds, (c) wild appears on reels 1/2/3, (d) bonus appears only on reels 0/2/4, (e) over 100k spins the hit-frequency estimate is within ±2% of target.

---

### P02 · Payline evaluator + paytable

**Scope.** Implement §3 (25 fixed paylines, left-to-right, ≥3 matches from reel 0) and §4.2 (paytable).

**Contract.**
- `src/pureLogic/paylines.ts` — `const PAYLINES: [row0, row1, row2, row3, row4][]` of length 25, each entry giving the row index for each reel. Use standard Starburst/Cleopatra line layouts.
- `src/pureLogic/paytable.ts` — `const PAYTABLE: Record<SymbolId, [k3: number, k4: number, k5: number]>` matching the §4.2 table exactly. Plus `scatterPayout(count: number): number` returning 2, 10, or 50 for 3/4/5 counts (in multiples of **total bet**, not line bet).
- `src/pureLogic/evaluate.ts` — `evaluate(grid, lineBet, totalBet): Pick<SpinOutput, 'wins' | 'scatterWin' | 'totalWin' | 'triggers'>`.

**Requirements.**
- Wilds substitute for any symbol except Scatter and Bonus (§5.1).
- A winning line must start on reel 0 and be contiguous left-to-right.
- A single line pays only the longest win (do not double-count 3-of-a-kind and 4-of-a-kind on the same line).
- Scatters pay anywhere regardless of payline, per §5.2.
- Triggers are computed here but not acted on: `freeSpins` = spin count for 3/4/5 scatters (10/15/25), `heist` = true when bonus on reels 0, 2, and 4, `wildRespin` = true when ≥2 wilds on the grid (§6.4).
- Gold Kanji 5-of-a-kind on any line sets a `fixedJackpot` flag in `triggers` (§7.1); the jackpot module is P07's job.

**Non-goals.** No cascading (P03 owns it). No RNG (P01 owns it). No animation.

**Parallelism note.** Fully independent of P01; tests feed hand-built grids.

**Acceptance.** Unit tests cover: each symbol's 3/4/5 payouts, wild substitution, scatter pays, 3-of-a-kind on line 1 only, 5 Gold Kanji fixed-jackpot flag, trigger flags for free spins / heist / wild respin.

---

### P03 · Cascading reels ("Chain Exploit")

**Scope.** Implement §6.2 cascade mechanics.

**Contract.**
- `src/pureLogic/cascade.ts` — `runCascade(initialGrid, lineBet, totalBet, rng): { steps: CascadeStep[]; totalWin }` where `CascadeStep { gridBefore, wins, multiplier, gridAfter }`. Multiplier is 1× on step 1, 2× on step 2, 3× on step 3+ (capped).
- Also export `collapseAndRefill(grid, positionsToRemove, rng): SymbolId[5][3]` so animation code can replay it step-by-step.

**Requirements.**
- After each evaluation, remove winning symbols, let remaining symbols fall to the bottom, and refill from the top using the same reel strips from P01.
- Chain ends when a step produces no wins.
- The cascade multiplier resets at the start of every base spin and at the start of every free spin.
- Call `evaluate` from P02 for each step.

**Non-goals.** No animation. Pure reducer: grid in, grid out, step list.

**Parallelism note.** Depends on P01's reel strips and P02's evaluator through imports, but can be developed against mocks; just commit after P01/P02 are in or rebase.

**Acceptance.** Given a hand-crafted grid with a known win on step 1 and a guaranteed next win on step 2, cascade produces 2 steps, applies 1× then 2×, and terminates.

---

### P04 · Free Spins state machine ("System Breach")

**Scope.** Implement §6.1.

**Contract.**
- `src/pureLogic/freeSpins.ts` — state machine with actions `START(count)`, `CONSUME_SPIN(result)`, `RETRIGGER(scatterCount)`, `END`. Exposes `{ remaining, totalWon, maxRetriggerRemaining, globalMultiplier: 2 }`.
- Uses `expandWild(grid): SymbolId[5][3]` helper that converts any wild on the grid into a full-column wild for free-spins rendering.

**Requirements.**
- All wins during free spins multiplied by 2× **after P03's cascade resolution**. P03 knows nothing about free spins; P04 is the wrapper that takes P03's `{ steps, totalWin }` output and multiplies `totalWin` (and each step's wins, for animation) by 2. This keeps the cascade module mode-agnostic.
- Effective per-step multiplier during free spins = `cascadeMultiplier × 2` (so step 2 of a free-spins cascade pays 2 × 2 = 4×). P04's tests must cover this stacking explicitly.
- Re-trigger adds +10 spins max per round (not per re-trigger — track cap).
- Wilds become expanding wilds (fill the column) during free spins only. Apply `expandWild(grid)` **before** passing the grid to `runCascade` so cascades see the expanded form.

**Non-goals.** No UI overlay; just a reducer.

**Parallelism note.** Independent reducer; tests hand-build scenarios.

**Acceptance.** Tests: 3-scatter start → 10 remaining, 4 → 15, 5 → 25; 2× is applied; re-trigger cap of +10 holds across multiple re-triggers in one round.

---

### P05 · Wild Respin ("Lockdown")

**Scope.** §6.4.

**Contract.**
- `src/pureLogic/wildRespin.ts` — `runWildRespin(grid, rng): { newGrid, wildsLocked: Position[] }`. Finds all wilds, holds them in place, re-rolls every non-wild cell using per-reel weights from P01.

**Requirements.**
- Triggers only on base-game spins with ≥2 wilds (§6.4). The evaluator flag from P02 tells the orchestrator when to call this.
- One respin only. Does not chain.
- Respin output is re-evaluated by P02's `evaluate` (caller's responsibility).

**Parallelism note.** Fully independent small module.

**Acceptance.** 2 wilds on the input grid remain on the output grid at the same positions; the rest of the grid is re-drawn.

---

### P06 · Heist Mini-Game ("The Data Vault")

**Scope.** §6.3 pick-em.

**Contract.**
- `src/pureLogic/heist.ts` — `createHeist(totalBet, rng, progressiveSnapshot): HeistState` and reducer `pick(state, terminalIndex): HeistState`. 12 terminals. Each hidden value is one of: credit prize (10×–500× total bet), multiplier (2×/3×/5×), `'ice'` (end trigger), `'jackpot'` (triggers jackpot roll — see P07).
- `HeistState { terminals: TerminalSlot[]; revealed: number[]; iceHits: number; totalWon; jackpotHit?: JackpotTier; status: 'active' | 'ended' }`.

**Requirements.**
- Terminal contents are pre-rolled at `createHeist` time from the RNG so replays are deterministic per seed.
- Three `ice` reveals ends the game.
- Exactly one `'jackpot'` terminal may exist per game, weighted rarely.
- Prize distribution: skew toward the low end (most common) with a long tail to 500×. Document the distribution inline.
- On `'jackpot'` reveal, return the tier rolled from `progressiveSnapshot` — selection weighting lives in P07.

**Non-goals.** No UI; no animations.

**Parallelism note.** Depends on P07's `rollJackpotTier` signature — stub it as an injected function parameter so P06 can be built before P07 lands. **Stub signature must match P07 exactly: `(rng: () => number, snapshot: JackpotSnapshot) => JackpotTier`**, both types from `src/types/bonus.ts` in P00. If P06 invents a different shape, integration breaks.

**Acceptance.** Tests: 3-ice sequence ends the game; jackpot terminal reveals call the injected roll fn; total won sums correctly.

---

### P07 · Jackpot system (fixed + 4-tier progressive counter)

**Scope.** §7.

**Contract.**
- `src/pureLogic/jackpots.ts`:
  - `const JACKPOT_SEEDS = { chip: 1000, disk: 10000, vault: 100000, mainframe: 1000000 }` (§7.2 table).
  - `createJackpotCounter(initialSeed?: number): JackpotCounter` — **returns an implementation of the `JackpotCounter` interface from P00's `src/types/stores.ts`**. Maintains the four tier pools. Exposes `tick(nowMs): Snapshot`, `hit(tier): Credits`, `snapshot(): Snapshot`.
  - The seeded incrementing runs each tier at a different cadence — Mainframe fastest to feel exciting, Chip slowest — per §7.3.
  - `rollJackpotTier(rng, snapshot): JackpotTier` — used by P06.
  - `resolveFixedJackpot(lineBet, paylines): Credits` — 5,000× line bet for Gold Kanji five-of-a-kind (§7.1 and paytable in §4.2).

**Requirements.**
- Counter persists across app closes via `localStorage`. (§7.3 phrases this as "doesn't reset when the player closes and reopens the app within a session" — the simpler and adequate interpretation: localStorage holds the pool until it's cleared or until a tier is `hit`.)
- On `hit(tier)`, that tier resets to its seed; the other tiers keep accumulating.
- Deterministic given the seed so tests don't flake.

**Non-goals.** No server pool. No real IAP-linked increments. No UI.

**Parallelism note.** Depends on no other logic module. P06 imports `rollJackpotTier` once both land; before then, P06 uses an injected stub.

**Acceptance.** Four tiers tick at different observable rates; `hit('vault')` resets vault only; snapshot serializes/deserializes through `localStorage` round-trip.

---

### P08 · Credit / balance / bet state store

**Scope.** §9.1, §9.2.

**Contract.**
- `src/pureLogic/wallet.ts` — framework-free store that **implements `WalletStore` from P00's `src/types/stores.ts`**. Fields: `balance: Credits, lineBet, totalBet, lastWin, sessionStats: { spins, wagered, won, netChange, startedAt }`. Actions: `setLineBet(n)`, `maxBet()`, `deductStake(totalBet)`, `creditWin(amount)`, `addPurchase(packId)`.
- Bet increments exactly the set in §9.2: `[1, 2, 5, 10, 25, 50, 100]`. No other values allowed.
- `MIN_TOTAL_BET = 25`, `MAX_TOTAL_BET = 2500`.
- Starting balance on first install = 10,000 CC (§9.1). Persists to `localStorage`.

**Requirements.**
- `deductStake` must atomically check that `balance >= totalBet` and reject otherwise. No going negative.
- Emits a single event per action; UI components (P14, P15) subscribe.

**Non-goals.** No real money. No purchase processing (P17 owns that).

**Parallelism note.** Fully independent module.

**Acceptance.** Tests: starting balance, bet increment cycle hits every legal value, deduct/credit correctness, `localStorage` round-trip.

---

### P09 · Progression, achievements, VIP tiers

**Scope.** §14.2, §14.3, §14.4. Bundled into one chunk because they share the "observer-on-gameplay-events" pattern and are small individually.

**Contract.**
- `src/pureLogic/progression.ts` — `xpFromWager(cc): number` (1 XP per 10 CC per §14.2), `levelForXp(xp)`, `rewardsForLevel(n)`. Store with `grantXp`, `claimLevelReward`.
- `src/pureLogic/achievements.ts` — `const ACHIEVEMENTS` list of ≥30 (§14.3; use the examples: Script Kiddie, Data Runner, Black ICE, Full Send, Chrome Dome, Corpo Killer, plus 24 more — invent them in-theme). Each has a predicate signature `(event: GameEvent) => boolean` and a CC reward. Store tracks unlocked set.
- `src/pureLogic/vip.ts` — `vipTierForLifetimeWager(cc): VipTier` returning one of Bronze/Silver/Gold/Platinum/Chrome Jack (§14.4). Also `vipPerks(tier)` returning daily multiplier, pack bonus %, unlocked themes list.

**Requirements.**
- All three stores persist to `localStorage`.
- Consumes the `GameEvent` union from P00's `src/types/events.ts` (defined there, not here). This chunk's stores `implement` the `ProgressionStore`, `AchievementsStore`, and `VipStore` interfaces from P00's `src/types/stores.ts`.

**Non-goals.** No UI.

**Parallelism note.** Independent of gameplay modules; they subscribe via events passed in from the orchestrator later.

**Acceptance.** Tests: XP ticks on spin events; "Trigger free spins 10 times" unlocks on the 10th free-spins event; VIP tier promotes correctly at lifetime-wager thresholds.

---

### P10 · Daily login bonus

**Scope.** §14.1.

**Contract.**
- `src/pureLogic/dailyBonus.ts` — `getTodaysReward(lastClaimTs, streakDay): { day: 1..7, cc, freeSpins?, heistEntry? }`. Streak advances on calendar-day basis; missing a day does not reset (per §14.1). On day 7 claim, streak loops back to day 1.
- Persists last claim timestamp + streak day.

**Non-goals.** No UI. UI in P21.

**Acceptance.** Tests: claim today → cannot claim again until tomorrow (mock `Date.now`); missed day keeps streak position; day-7 claim gives 25k CC + Heist entry and cycles back.

---

### P11 · Auto-spin orchestrator + cooldown + responsible-play caps

**Scope.** §12 entirely.

**Contract.**
- `src/pureLogic/autoSpin.ts` — orchestrator that given a spin function, a wallet reference, and user-chosen stop conditions from §12.1, runs 10/25/50/100 (or custom 1–100) spins with a 2-second min interval (§12.2). Exposes `start(config)`, `cancel()`, `onTick(cb)`.
- Stop conditions (all default-on per §12.1, user-toggleable): balance-below, single-win-above, any-bonus-trigger, total-loss-above.
- `src/pureLogic/responsiblePlay.ts` — separate module for session-time reminders (15/30/60/120 min or off), daily-playtime soft cap, daily-spend soft cap, high-bet confirmation prompt on bets >500 CC after >50,000 CC session loss (§12.2).

**Requirements.**
- Min 2-second spin interval is **not** user-adjustable (§12.2).
- "Turbo" mode (§12.1) affects only animation skipping — not the 2-second interval.
- High-bet confirmation is emitted as a `{ type: 'highBetConfirmRequest', bet }` event on the shared `GameEvent` channel defined in P00. **P23's GameController subscribes and shows the confirmation modal**; P11 never renders anything. The controller also owns the "user confirmed / cancelled" reply path back into P11.

**Non-goals.** No UI. No audio. No real timers during tests (inject clock).

**Acceptance.** Tests with injected fake clock: (a) 10-spin run respects 2s interval, (b) balance-below stop fires correctly, (c) high-bet confirmation emits under the §12.2 condition.

---

### P12 · Age gate + responsible-play disclosure content

**Scope.** §17.1 (age gate) and the content for the Responsible Play menu screen.

**Contract.**
- `src/pureLogic/ageGate.ts` — `shouldPromptAgeGate(): boolean` (true on first launch), `setAgeConfirmed(bornIso: string)`. Blocks app use until ≥18 is confirmed; persists.
- `src/content/responsiblePlay.ts` — static content: disclosure copy, helpline links (US: 1-800-GAMBLER; UK: GamCare; generic international), session caps explainer, no-real-money disclaimer.

**Parallelism note.** Content module, entirely independent.

**Acceptance.** First launch returns `true` from `shouldPromptAgeGate`; after confirming 18+, it returns `false` across reloads.

---

### P13 · Privacy Mode (PIN, biometric, fast-exit, alternate icons)

**Scope.** §13.1 — banking-app pattern only. **Do not** build the impersonation variant (§13.2 explicitly excludes it).

**Contract.**
- `src/pureLogic/privacy.ts` — PIN lock store: `setPin`, `verifyPin`, `isLocked`. Persisted as salted SHA-256 (not plaintext). Exposes `tryBiometric()` that calls `navigator.credentials.get` where available and falls back to PIN.
- `src/app/FastExit.tsx` (this one is a UI hook, but living in pureLogic territory as a small orchestrator because it's cross-cutting) — four-finger swipe-up detector; on trigger, navigates the app immediately to a neutral home-screen state, wipes in-memory state, and re-locks.
- `src/pureLogic/altIcon.ts` — exposes the set of alternate icons (calculator-style, generic "Tools", neon geometric, default DATA HEIST). Uses iOS `setAlternateIconName` / Android icon aliases when available; no-op in browser.

**Requirements.**
- Alternate-icon set must be "aesthetically neutral" (§13.1) — no icon may claim to be a specific named other app (no "Calculator", no "Notes"). Generic tool icon is okay; "Calculator by Apple" is not.
- PIN is local-only. No server. No cloud sync.

**Non-goals.** No app-impersonation feature, full stop. No fake lock screen that opens a game on a secret PIN.

**Acceptance.** PIN set/verify round-trips; fast-exit gesture wipes in-memory UI state and returns to lock; alternate icons load as a list of 3–4 options.

---

## Layer 2 — UI components (parallel; consume P00 types + mock stores)

Every chunk below is a React component (or small group of components) living under `src/ui/`. They import types from P00 and call into Layer-1 stores **through the interfaces published in `src/types/stores.ts`** — never against a concrete Layer-1 implementation. This is what makes the UI work parallelizable: every mock you write is typed by the same interface the real store will implement, so the swap-in when Layer 1 lands is mechanical.

**Mocking pattern every UI chunk follows:**
```ts
import type { WalletStore } from '@/types/stores';
const mockWallet: WalletStore = {
  getState: () => ({ balance: 10_000, lineBet: 1, totalBet: 25, lastWin: 0, sessionStats: {...} }),
  subscribe: (cb) => { /* no-op for static mocks, or setInterval for demos */ return () => {}; },
  setLineBet: () => {}, maxBet: () => {}, deductStake: () => true, creditWin: () => {}, addPurchase: () => {},
};
```
When the real P08 wallet lands, a one-line import swap replaces the mock. If a UI chunk drifts from the interface, `tsc` flags it immediately.

### P14 · Reel grid + spin button

**Scope.** §10.1 center, §2 spin trigger, §3 grid layout.

**Contract.**
- `src/ui/ReelGrid.tsx` — renders a 5×3 grid from a `SymbolId[5][3]` prop. Handles spin animation (reels rolling top-to-bottom with staggered stops, reel-stop clicks from P19 audio, landing bounce). Props: `grid`, `isSpinning`, `winningCells: Position[]`, `cascadingCells: Position[]`, `onAnimationComplete`.
- `src/ui/SpinButton.tsx` — dominant `#C8FF00` neon yellow-green button (§10.1), spin trigger, disabled while spinning, respects 2s cooldown from P11.

**Requirements.**
- Symbol images come from P00's `symbolAssets` manifest.
- Active reel border glow `#C8FF00` on winning row after resolution (§10.1).
- Winning paylines animate in `#FF2D78` magenta (§8.3, §10.1).
- Cascading cells animate pixel-dissolve (§6.2).
- Spin resolution must feel instantaneous at input (<100ms) even with 2–3s animation (§2 last paragraph).

**Parallelism note.** Mock the spin result with a hand-built `SpinOutput` while P01/P02/P03 are in flight.

**Acceptance.** Storybook-style demo page in dev renders all symbols, plays a fake spin, highlights a fake winning line.

---

### P15 · Bottom bar: bet controls, balance, last win, max bet, auto-spin

**Scope.** §10.1 bottom bar, §9.2 bet sizing.

**Contract.**
- `src/ui/BottomBar.tsx` composed of `LineBetStepper` (− / +), `TotalBetReadout` (derived: lineBet × 25), `LastWinReadout`, `MaxBetButton`, `AutoSpinButton`.
- `LineBetStepper` cycles through `[1, 2, 5, 10, 25, 50, 100]` from P08. Disabled at min/max ends.
- `MaxBetButton` sets line bet to 100 CC (= 2,500 total) in one tap.

**Requirements.**
- Balance always visible in top bar (Bishal US #1 per §10.2).
- Current bet always clearly displayed (US #2).
- Bet adjustment no more than 1 tap deep (§10.2).
- Consume P08's wallet through the `WalletStore` interface from P00's `src/types/stores.ts`. If P08 isn't in yet, build a mock typed as `WalletStore` per the Layer 2 intro pattern.

**Acceptance.** Stepper cycles legal values, max-bet snaps to 100, readout math correct, balance live-updates on subscribed events.

---

### P16 · Top bar: balance, jackpot ticker, menu

**Scope.** §10.1 top bar.

**Contract.**
- `src/ui/TopBar.tsx` — balance (left), scrolling 4-tier jackpot ticker (center) subscribing to P07's `JackpotCounter`, menu button (right) opening P22's drawer.
- Ticker cycles Chip → Disk → Vault → Mainframe on a 3-second rotation, each value counting up visibly from P07's `tick`.

**Parallelism note.** Build a mock typed as `JackpotCounter` (from P00's `src/types/stores.ts`) that emits incrementing numbers on an interval until P07 lands.

**Acceptance.** All four tiers show in rotation; values tick up; menu button opens placeholder drawer.

---

### P17 · Mock purchase pack store

**Scope.** §9.3, §9.4 — **mock purchase only**. Critical decision locked in §18.1 #5: UI must look real, but no money is processed.

**Contract.**
- `src/ui/Store.tsx` — grid of six packs (Starter / Small / Medium / Large / Mega / Whale) with price, CC, CC-per-$ value, and "Best Value" / "Most Popular" labels on Mega / Medium respectively.
- `src/ui/PurchaseSheet.tsx` — native-styled confirmation sheet (iOS + Android variants via `navigator.userAgent` sniff is fine; visual parity is what matters). "Processing…" spinner for 1–1.5s, success screen with CC-credit animation.
- `src/services/purchaseService.ts` — `PurchaseService.buyPack(packId): Promise<PurchaseResult>` interface. Implementation in MVP: `await sleep(1200); wallet.addPurchase(packId); return { success: true, stub: true }`. **No real payment API is called. Zero network calls.**
- **Visible `DEMO MODE — no real charges` banner** at the top of the store screen (§9.4 last paragraph — non-negotiable).

**Requirements.**
- The `PurchaseService` interface must be the **only** thing UI code calls. When v2 swaps in real IAP, only the implementation changes (§9.4).
- No pressure tactics (no "featured", no "limited time" countdown) per §9.3 last paragraph.
- Clear cost display, no obfuscation.

**Non-goals.** No StoreKit / Play Billing integration. No webhook handler.

**Acceptance.** All six packs render; tapping any pack runs the mock flow; wallet balance increases by the pack's CC; demo banner is visible.

---

### P18 · Heist mini-game UI

**Scope.** §6.3 presentation.

**Contract.**
- `src/ui/HeistModal.tsx` — full-screen modal with 12 terminal buttons in a 3×4 or 4×3 arrangement, neon green scanning effect on the unopened set, themed data-vault backdrop.
- Consumes P06's `HeistState`; dispatches `pick(i)` on terminal tap.
- Reveal animations: prize = counter-roll-up, multiplier = symbol flare, ICE = red alarm flash, jackpot = full-screen cinematic handoff to P07's jackpot reveal.
- "End run" summary screen after 3 ICE or manual cash-out.

**Parallelism note.** Build a mock typed as `HeistState` (from P00's `src/types/bonus.ts`) until P06 lands.

**Acceptance.** Storybook demo: 12 terminals visible; tapping cycles states; ICE ends the game; summary shows.

---

### P19 · Win celebrations (tiered animations + audio cues)

**Scope.** §11.1 and §11.3 audio routing for wins.

**Contract.**
- `src/ui/WinOverlay.tsx` — single component that accepts `{ winCredits, totalBet }` and picks the correct tier from §11.1 table: none / small / medium / big / mega / epic. Plays the matching animation and fires the matching audio cue through P20's audio manager.
- Tap-to-skip on big+ wins (§11.1 last paragraph).

**Requirements.**
- Small wins resolve in <1.5s (§11.1 last paragraph).
- Epic Win / Jackpot uses the themed animation (matrix code rain or vault door opening, §11.1 table) and counter climbs for 6–10s.
- Must not block further input after resolution — the game loop continues; the overlay is cosmetic.

**Acceptance.** Storybook matrix: one button per tier triggers the matching celebration end-to-end with placeholder audio.

---

### P20 · Audio manager

**Scope.** §11.3.

**Contract.**
- `src/ui/audio.ts` — `AudioManager` with `play(cueId)`, `loop(cueId)`, `stop(cueId)`, `setMuted(bool)`, `isMuted()`. Mute state persists across sessions (§11.3 last line).
- Cue manifest: `spinLoop`, `reelStop`, `winSmall`, `winMedium`, `winBig`, `winMega`, `winEpic`, `jackpotChip`, `jackpotDisk`, `jackpotVault`, `jackpotMainframe`, `buttonClick`, `bgMusic`.
- Uses the Web Audio API (not `<audio>` tags) for low-latency spin sounds.

**Requirements.**
- Asset paths point at `/assets/audio/<cueId>.mp3` placeholders. Assets ship separately (Thy's Freesound curation, §11.3).
- Background music loops; must not fatigue (ambient synth per §11.3).

**Non-goals.** Audio itself — placeholders only.

**Acceptance.** Unit tests mock Web Audio; integration demo page with buttons for each cue.

---

### P21 · Paytable screen, daily login modal, achievements screen, VIP status screen

**Scope.** §10.3 (paytable), §14.1 (daily login UI), §14.3 (achievements UI), §14.4 (VIP UI). Grouped because all four are read-mostly scrollable lists/grids that fit the same component pattern.

**Contract.**
- `src/ui/Paytable.tsx` — grid of all 13 paying symbols with 3/4/5 payouts from P00's paytable, plus 25-line payline diagram (SVG), plus short descriptions of Wild, Scatter, Bonus.
- `src/ui/DailyLoginModal.tsx` — 7-day calendar; consumes P10 `dailyBonus`; claimable day glows.
- `src/ui/AchievementsScreen.tsx` — list of all ≥30 achievements from P09; unlocked ones show a CC-reward-claimable button.
- `src/ui/VipScreen.tsx` — shows current tier, lifetime wager progress bar to next tier, perks per tier from P09.

**Requirements.**
- Paytable must be accessible at any time via menu button (§10.2, §10.3). Non-modal if possible (player can review while reels still visible).
- All four screens consume their respective Layer-1 stores through the interfaces in `src/types/stores.ts`; build interface-typed mocks until the stores land.

**Acceptance.** Each screen renders a representative state and navigates back to main without state loss.

---

### P22 · Main menu drawer + settings + privacy mode UI

**Scope.** §10.1 hidden-behind-menu items, §13.1 privacy UI, §12.2 responsible-play user toggles.

**Contract.**
- `src/ui/MenuDrawer.tsx` — slide-in drawer with entries: Paytable, Settings, History, Help, Privacy Mode, Daily Bonus, VIP Status, Responsible Play.
- `src/ui/Settings.tsx` — sound mute, haptics toggle, auto-spin defaults, turbo mode default, session-time reminder interval, daily playtime cap, daily spend cap, high-bet confirmation toggle.
- `src/ui/PrivacySettings.tsx` — PIN setup, biometric enable, fast-exit gesture toggle with demo, alternate-icon picker. Routes through P13.
- `src/ui/History.tsx` — last 50 spins with timestamp, bet, win, and a win-breakdown drill-down (§8.3: `3× Gold Kanji on Line 7 → 200× × 10cr = 2,000cr`).

**Requirements.**
- Everything in Settings persists to `localStorage`.
- Bet adjustment is in the bottom bar, not in the drawer (§10.2 — "bet adjustment must never be hidden behind multiple taps").

**Acceptance.** Drawer opens/closes; each entry navigates to the correct screen; history shows the last 50 spins (mock until game loop ties together).

---

## Layer 3 — Wire-up (last, single integrator chunk)

### P23 · Game loop integration + onboarding

**Scope.** §2 end-to-end loop + §16.5 onboarding.

**Contract.**
- `src/app/GameController.ts` — orchestrates a spin: check cooldown (P11) → deduct stake (P08) → spin reels (P01) → evaluate (P02) → run cascades (P03) → check triggers → enter free-spins (P04) / wild-respin (P05) / heist (P06) → credit wins (P08) → emit gameEvent to progression, achievements, VIP (P09) → show win overlay (P19) → play audio (P20).
- `src/app/OnboardingModal.tsx` — first-run tutorial per §16.5: shows paytable, explains that "System Breach" = Free Spins and "The Data Vault" = pick-em bonus (both labels visible so no theme literacy required).

**Requirements.**
- **Boot order (before any UI mounts):** age gate (P12) → if confirmed, hydrate P08 wallet, P07 jackpot counter, P09 progression/achievements/VIP, P10 daily bonus, P13 privacy store from `localStorage`. Only then mount the React tree. This prevents UI components from subscribing to half-initialized stores.
- Controller must emit a single `GameEvent` per phase transition so P09's subscribers stay in sync.
- **Trigger-state discrimination:** P02's evaluator sets `triggers.wildRespin` purely from wild count. The controller **ignores `wildRespin` when current `BonusState` is `freeSpins`** — wild respin is a base-game-only mechanic (§6.4). Free-spins expanding wilds are P04's job and do not re-roll.
- **High-bet confirmation handler:** subscribe to `{ type: 'highBetConfirmRequest' }` from P11. On receipt, pause the spin loop, show a confirmation modal (lightweight — can live inline in GameController or as `src/app/HighBetConfirm.tsx`), resume or cancel based on user choice.
- **Dev-only seeded RNG hook:** when `import.meta.env.DEV` is true, read `?seed=` from `window.location.search` on boot and pass that seed to `createRng`. This is how P24's E2E tests force deterministic grids for bonus-trigger specs. Production builds must tree-shake this branch out (guard with `import.meta.env.DEV` directly so Vite dead-code-eliminates it).
- Onboarding is shown once (stored flag); user can re-open from Help menu.

**Non-goals.** No new features — this chunk is pure integration.

**Parallelism note.** This is the one chunk that must be done last; everything else is built against the contracts and mocked, then snapped in here.

**Acceptance.** End-to-end: launch app → age gate → onboarding → play a spin → see cascades → hit scatters → free spins play out → all event counters tick.

---

## Layer 4 — E2E & polish (sequential, after P23)

These four chunks run in order after the game loop is wired up. They are deliberately **not** parallel — each one depends on the codebase being in a working, integrated state.

### P24 · Playwright E2E suite

**Scope.** Whole-app behavioral verification — the unit tests in Layers 1–2 cover module contracts; this chunk covers what a player actually sees.

**Contract.**
- Install `@playwright/test`; add `playwright.config.ts` targeting Chromium + WebKit against `npm run dev` on `localhost:5173`.
- Add `npm run e2e` and `npm run e2e:headed` to `package.json`.
- Create `tests/e2e/` with at minimum these specs:
  - `bootstrap.spec.ts` — first launch shows age gate; confirming 18+ reveals onboarding; dismissing onboarding mounts the reel grid with starting balance 10,000 CC visible in the top bar.
  - `spin.spec.ts` — spin button click deducts `totalBet` from balance; 5×3 grid fully populated after spin resolves; spin button disabled during the 2-second cooldown (§12.2).
  - `betting.spec.ts` — `+` / `−` cycle through `[1, 2, 5, 10, 25, 50, 100]`; Max Bet snaps to 100; both disabled while spinning.
  - `autoSpin.spec.ts` — 10-spin auto run terminates after 10 spins; balance-below stop cancels early; cancel button halts mid-run.
  - `paytable.spec.ts` — menu → Paytable opens the screen; all 13 paying symbols render with their 3/4/5 payouts; closing returns to the reel grid without losing balance state.
  - `bonusTriggers.spec.ts` — force a 3-scatter grid via the `?seed=…` dev URL param (read by P23's GameController, not P01 — P01 stays pure). Verify free-spins overlay shows "10 spins remaining" and 2× multiplier is applied to subsequent wins.
  - `store.spec.ts` — store screen shows the "DEMO MODE — no real charges" banner; buying the Starter pack credits the expected CC to the wallet; zero network requests leave the page (assert via `page.on('request')`).
  - `responsiblePlay.spec.ts` — session-time reminder fires at the configured interval (mock `Date.now` via `page.clock`); high-bet confirmation prompt appears under the §12.2 condition.

**Requirements.**
- Use `getByRole` / `getByLabel` selectors — no CSS-class selectors that will rot with styling changes.
- The seeded-RNG dev hook (owned by P23 per its Requirements block) must only be active when `import.meta.env.DEV` is true; production builds must strip it.
- Tests run headless in CI; `e2e:headed` is for local debugging.
- Each spec is independent — no shared state between test files.

**Non-goals.** No visual regression / screenshot diffing yet (that's a v2 concern). No mobile device emulation beyond Playwright's built-in viewports.

**Acceptance.** `npm run e2e` passes all specs on a clean clone after `npm install && npm run build`. CI workflow file (`.github/workflows/e2e.yml`) runs the suite on PRs.

---

### P25 · Lint + JSDoc/TSDoc pass

**Scope.** Bring the whole codebase to a clean bill of lint health and fill in missing API documentation.

**Contract.**
- Run `npm run lint` across the repo; fix every error and warning. No `// eslint-disable-next-line` without a comment explaining why.
- Audit every exported symbol in `src/pureLogic/`, `src/ui/`, `src/app/`, and `src/services/`. Every exported function, class, type, and constant must have a TSDoc block with `@param`, `@returns`, and `@throws` (where applicable). React components document their props via the prop type, plus a one-line `/** */` above the component describing what it renders.
- Add `typedoc` as a dev dep and an `npm run docs` script that emits browsable HTML docs to `docs/api/` (gitignored). This is for human reference during development, not a shipped artifact.
- Verify the P00 ESLint rule forbidding React/DOM imports from `src/pureLogic/` is still passing — add a test case if it isn't already covered.

**Requirements.**
- Do not change runtime behavior. This chunk is docs + lint only.
- If lint flags a real bug (not a style issue), flag it in the PR description rather than silently fixing it — fixes go in P26.

**Non-goals.** No new features. No refactors.

**Acceptance.** `npm run lint` exits clean. `npm run docs` produces a non-empty `docs/api/` tree. Every exported symbol listed in P00's contract has a TSDoc block.

---

### P26 · Clean-code audit

**Scope.** Structured refactor pass to pay off shortcuts taken during parallel development.

**Contract.** Go through the codebase and flag + fix each of these, with a before/after diff in the PR description for every change:
- **Long functions:** any function >40 lines (excluding JSDoc) gets split into named helpers. The 40-line rule is a trigger for review, not an absolute cap — document the call when you keep one.
- **Magic numbers:** numeric literals appearing in logic (not test fixtures) get promoted to named constants in the nearest module or, if cross-cutting, into `src/theme/tokens.ts` or `src/pureLogic/constants.ts`.
- **Duplicated logic:** anything copy-pasted across two or more files gets extracted to a shared helper. Particular attention to: symbol-counting on the grid, payline-row extraction, `localStorage` read/write boilerplate, and CC formatting.
- **Weak names:** single-letter locals outside of tight loops, abbreviations, and misleading names get renamed. Variable names should read as English nouns for state and English verbs for actions.
- **Missing error handling:** any `await` or Promise chain without a `try/catch` or `.catch` gets one. `localStorage` access in particular must handle quota-exceeded and disabled-storage cases.
- **Dead code:** unused exports, commented-out blocks, and `TODO:` comments older than the branch itself get removed or converted to tracked issues.

**Requirements.**
- Every change must be behavior-preserving: `npm test` and `npm run e2e` stay green.
- PR description lists each finding with file path, before snippet, after snippet, and one-sentence rationale.
- If a refactor turns out to be risky or large, punt it to a follow-up issue rather than ship it here.

**Non-goals.** No new features. No performance tuning (that's a separate pass if we ever need it).

**Acceptance.** All Layer-1 and Layer-2 tests still pass. All E2E specs from P24 still pass. Lint still clean. PR description documents every change.

---

### P27 · README, style guide, and release notes

**Scope.** The human-facing documentation that ships in the repo.

**Contract.**
- `README.md` — rewrite (or write, if still a GitHub placeholder):
  - Project description and cyberpunk theme overview in 2–3 paragraphs.
  - "DEMO MODE — no real money" disclaimer prominently near the top.
  - Quickstart: clone, `npm install`, `npm run dev`.
  - Test commands: `npm test`, `npm run e2e`, `npm run lint`, `npm run docs`.
  - Architecture overview: Layer 0 / 1 / 2 / 3 / 4 with one-line summaries of each, linking to this doc.
  - File-tree summary: one line per top-level `src/` directory describing its responsibility.
  - Responsible play: link to the content module in P12, plus the US / UK helpline numbers.
  - Credits and license.
- `STYLE-GUIDE.md` — a one-page document of the conventions actually used in the codebase (not aspirational). Cover: quote style (single vs double), semicolon policy, TSDoc tag ordering, import grouping, React component file layout, test naming convention, commit message format. Derive this from what P25 normalized to; do not invent new rules.
- `CHANGELOG.md` — initial entry for v0.1.0 listing the shipped features by `game_design.md` section (§2 spin loop, §3 25 paylines, §6.1–§6.4 all four bonus modes, §7 jackpots, §9 economy, §10 UI shell, §12 responsible play, §13 privacy mode, §14 progression, §17 age gate).

**Requirements.**
- Markdown is linted by `markdownlint` in the lint pipeline; README must pass.
- Every numeric claim in the README (starting balance, paylines, bet range, free-spin counts, jackpot seeds) cross-references `game_design.md`; if the two disagree, fix the README — the design doc is canonical.

**Non-goals.** No marketing copy. No screenshots (they'd go stale before the first PR after this one).

**Acceptance.** A teammate who has never seen the project can go from clone to running game to running the test suite in under 10 minutes using only the README. Markdown linter is clean.

---

## Quick dependency map

```
P00  foundation (everyone waits for this)
 ├── P01 rng/reels ─┐
 ├── P02 paylines ──┼── P03 cascade ──┐
 ├── P04 free spins ──────────────────┤
 ├── P05 wild respin ─────────────────┤
 ├── P06 heist ─── (stub P07) ────────┤
 ├── P07 jackpots ────────────────────┤
 ├── P08 wallet ──────────────────────┤
 ├── P09 progression/ach/vip ─────────┤
 ├── P10 daily bonus ─────────────────┤
 ├── P11 auto-spin/responsible ───────┤
 ├── P12 age gate ────────────────────┤
 ├── P13 privacy ─────────────────────┤
 ├── P14 reel grid UI ────────────────┤
 ├── P15 bottom bar UI ───────────────┤
 ├── P16 top bar UI ──────────────────┤
 ├── P17 mock store ──────────────────┤
 ├── P18 heist UI ────────────────────┤
 ├── P19 win overlay ─────────────────┤
 ├── P20 audio ───────────────────────┤
 ├── P21 paytable/daily/ach/vip UIs ──┤
 └── P22 menu/settings/privacy UI ────┤
                                      ▼
                                 P23 integration
                                      │
                                      ▼
                                 P24 e2e suite
                                      │
                                      ▼
                                 P25 lint + docs
                                      │
                                      ▼
                                 P26 clean-code audit
                                      │
                                      ▼
                                 P27 readme + style guide
```

**28 prompts total · 22 parallelizable after P00 · 1 integrator · 4 sequential polish chunks at the end.**

Each prompt covers a distinct feature slice from `game_design.md`, references the section it implements, and specifies the mock/interface it should stand behind so the rest of the team never blocks on it.

---

## Log entry template

Copy this block into a dev log (e.g. `DEVLOG.md` or a shared doc) for every prompt executed. The point is traceability: when something breaks in week 3, you want to know which prompt produced the code and what Claude actually did with it.

```markdown
## Entry [N] — [YYYY-MM-DD HH:MM] — [P##]

**Chunk:** P## · [chunk title]
**Branch:** [branch name]
**Operator:** [who ran the prompt]
**Prompt used:** [paste the chunk verbatim, or link to commit SHA of the version used]

**Outcome:** [1–3 sentence summary of what Claude produced]

**Lint result:** [clean / N errors auto-fixed / N errors hand-fixed]
**Unit tests:** [M passing / N failing — if failing, list which]
**E2E tests (if applicable):** [passing / failing / n/a]

**Contract compliance:** [did the output match the P00 types and this chunk's Contract block? Yes / No — if No, what drifted]

**Issues encountered:** [anything unexpected — Claude inventing APIs, misreading the spec, flaky test, etc.]

**Hand-edits required?** Yes / No
→ If yes: [what failed, what you changed manually, why Claude couldn't do it]

**Files changed:** [list, or link to PR diff]
**Commit message:** [feat|fix|test|docs|refactor]([chunk]): [description]
**PR link:** [url]
```

**Operator tips.**
- Log immediately after each run, not at the end of the day — details evaporate fast.
- If a chunk needed more than one Claude Code session, log each session as a separate entry with the same `P##`.
- If you deviated from the chunk's Contract block, note it — the next person to touch adjacent code needs to know the contracts drifted.