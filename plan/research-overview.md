# Research Overview — Tech Warmup II: Better Slot Machine

**Team #7**
**Leaders:** Ethan Carter, Gabrielle Wang
**Project:** Building a better slot machine with AI
**Working Title:** *DATA HEIST* — a cyberpunk-themed slot

---

## Table of Contents

- [Summary](#summary)
- [Key Research Themes](#key-research-themes)
  - [1. Core Mechanics and Architecture](#1-core-mechanics-and-architecture)
  - [2. Fairness, RTP, and Volatility](#2-fairness-rtp-and-volatility)
  - [3. Types of Slot Machines](#3-types-of-slot-machines)
  - [4. Player Engagement and Psychology](#4-player-engagement-and-psychology)
  - [5. Player Demographics and Motivations](#5-player-demographics-and-motivations)
  - [6. Visual, UI, and Audio Design](#6-visual-ui-and-audio-design)
  - [7. Monetization and Regulatory Landscape](#7-monetization-and-regulatory-landscape)
  - [8. Emerging Requirements: Explainable AI](#8-emerging-requirements-explainable-ai)
  - [9. Visual Direction: DATA HEIST](#9-visual-direction-data-heist)
- [Team Roster](#team-roster)
- [Individual Contributions](#individual-contributions)
- [Conclusion](#conclusion)

---

## Summary

This document consolidates the domain, user, and visual research conducted by Team #7 in preparation for the Better Slot Machine project. Our collective goal was to understand how modern slot machines work — mechanically, visually, economically, and psychologically — so that we can design a version that is engaging, fair, transparent, and technically well-grounded.

The research covered the full stack of slot machine design: foundational architecture and mathematics, types of machines on the market, player demographics and motivations, visual and audio design language, regulatory and monetization models, emerging AI interpretability requirements, and direct qualitative observation of real players. In parallel, the team produced a concrete visual direction — a cyberpunk concept called *DATA HEIST* — backed by wireframes, desktop and mobile mockups, a complete asset sheet, a logo, typography, sound effects, and a full color system. Every team member contributed at least one focused investigation or deliverable, and the findings below represent the synthesis of that work.

---

## Key Research Themes

### 1. Core Mechanics and Architecture

A slot machine, at its simplest, takes currency as input, spins 3–5 reels covered in symbols, and pays out based on whether matching symbols land on one or more paylines. Classic machines featured a single payline, while modern machines may evaluate thousands of paylines running horizontally, diagonally, or in zigzag patterns. Modern implementations are entirely software-defined: a Random Number Generator (RNG) determines each spin independently, and a programmable paytable controls symbol weighting and variance.

The standard execution loop for a spin is: *bet input → spin trigger → RNG call → symbol matrix generation → payline evaluation → payout → state update*. Within this loop, the 5×3 reel grid paired with 20–25 fixed paylines and Wild/Scatter modifiers has become the statistical baseline for implementation, though alternative evaluation models (Ways to Win, Cluster Pays, Megaways, Scatter arrays) are widely used.

### 2. Fairness, RTP, and Volatility

Three mathematical concepts define the fairness and feel of a slot machine:

- **RNG independence** — every spin is statistically independent of every other spin. No pattern, streak, or "hot/cold" state actually exists in a correctly implemented machine.
- **Return to Player (RTP)** — a long-term fairness metric describing the percentage of wagers paid back over time. Modern real-money apps typically fall in the 96–99% range, which slightly favors the house but is regulated in most jurisdictions.
- **Volatility (Variance)** — the risk profile of the game. Low-volatility games deliver frequent small wins; high-volatility games deliver rare large wins. This single parameter dramatically changes how the game feels to play.

Symbol weighting is the primary lever for tuning both RTP and volatility: high-value symbols (such as 7s) appear far less frequently than common ones (such as cherries).

### 3. Types of Slot Machines

The market has evolved from **three-reel mechanical slots** (simple, fruit-and-bar symbols, hard to find today) to **video slots**, which are now the industry standard. Video slots provide the foundation on which most modern variants are built, including:

- **Penny slots** — accessible 1-cent minimum bets appealing to casual players.
- **Themed slots** — built around a specific concept (Ancient Egypt, space, mythology). Extremely popular and one of the strongest engagement drivers.
- **Branded slots** — licensed IP such as Jurassic Park, James Bond, or Broadway; particularly effective at drawing in fans who don't ordinarily gamble.
- **Progressive jackpot slots** — pool bets across many machines (and sometimes across casinos) to produce payouts in the millions while keeping buy-in low.

### 4. Player Engagement and Psychology

A game of pure luck, in principle, is not inherently exciting. What keeps players engaged is a carefully engineered layer of sensory and psychological design on top of the RNG:

- **Strong visuals, bright colors, and cohesive themes** that make each spin feel stimulating rather than mechanical.
- **Near-miss feedback** — showing the symbols just above and below the payline so players can see they "almost" won. This is purely visual (the outcome is already RNG-determined) but has an outsized effect on retention.
- **Gameplay modifiers** — wilds, multipliers, bonus spins, cascading reels, and mini-games that break the monotony of simple spin-and-see play.
- **Win celebrations** — sound effects, screen animations, and scaled visual flair that make a win feel larger than the number on screen.
- **Accessibility of payout structure** — low buy-ins paired with high potential payouts (progressive jackpots, penny slots) remove the perception that big wins require big risk.
- **Cultural and superstitious framing** — "hot" and "cold" machines, lucky symbols, and ritualized play increase perceived agency even when none exists.

### 5. Player Demographics and Motivations

The core slot audience skews older and more female than the general casino population, with women aged 55–64 representing the dominant demographic. Slots appeal to this group because they are non-competitive, self-paced, and lower-risk than table games. Contrary to stereotype, the average player's income and homeownership rate track closely with U.S. medians.

A critical and concerning finding: roughly 5% of users generate up to 82% of casino slot revenue, indicating a strong link between profitability and at-risk gambling behavior. Within the broader audience, players segment into "Utilitarian" users seeking long low-stakes sessions and "Excitement" users chasing larger thrills. Over 60% of players are primarily driven by the steady dopamine loop of small frequent payouts rather than the pursuit of the jackpot — a vital insight for designing reward pacing.

### 6. Visual, UI, and Audio Design

Good slot UI is simple, obvious, and spin-centric:

- The **spin button (or lever)** is the dominant interaction and should be visually emphasized above all other controls.
- **Symbols** should be large, high-contrast, recognizable, and thematically consistent.
- **Paylines** should visibly connect matching symbols so players can glean at a glance how successful a spin was.
- **Balance, bet amount, and total win** should always be readable.
- Currency input and purchase flows should be **secure and visually separate** from the core gameplay surface.
- **Backgrounds** should have depth, motion, and thematic coherence — static backgrounds (such as a flat poker-felt green) were repeatedly cited by players as a reason a game felt boring even when payouts were good.
- **Cascading wins, explosive animations, and layered sound effects** make wins feel significantly larger and are one of the clearest differentiators between slot games players enjoyed and games they abandoned.

### 7. Monetization and Regulatory Landscape

The slot market splits into two distinct categories, both using identical underlying RNG mechanics and psychological design:

- **Real-money apps** (DraftKings Casino, BetMGM, FanDuel Casino) — tightly regulated, legal in only 8 U.S. states as of 2026, require licensing and age verification. The U.S. market is approximately $6.9 billion, with mobile accounting for more than half. Typical RTP is 96–99%.
- **Social / free-to-play casino apps** (Slotomania, House of Fun, Zynga Slots) — virtual currency only, minimal regulation, monetized through in-app purchases. Only about 12% of users spend money, but a small set of "whales" drives most of the revenue. The global market exceeds $9 billion. Daily login bonuses, level progression, achievements, and VIP tiers are standard retention tools.
- **Sweepstakes casinos** — a grey-area hybrid letting users redeem virtual coins for real prizes; 10+ states, including California, have banned or restricted it as of 2026.

The key financial difference is who holds the risk: the player directly in real-money apps, or the player optionally through in-app purchases in social apps.

### 8. Emerging Requirements: Explainable AI

EU regulators and emerging California laws are beginning to require that AI-driven gameplay decisions be interpretable. This matters because AI systems can, for example, detect that a player is about to stop and deliver an intentional near-miss to extend the session — a pattern that regulators may classify as manipulative. The industry is adopting interpretability frameworks such as **SHAP** (game-theoretic feature attribution, useful for proving exactly which inputs caused a bonus or win) and **LIME** (fast, human-readable per-spin explanations). Any AI-augmented slot machine built today should plan for this interpretability requirement from the start.

### 9. Visual Direction: DATA HEIST

Separately from the written research, the team has already produced a concrete visual direction for the project. The working title is **DATA HEIST**, a cyberpunk-themed slot with a dark neon aesthetic built from two complementary deliverables:

**Wireframes, Assets, and Mockups (Theo Lee).** A full set of wireframes covering the lobby, main spin screen, and secondary states, paired with a cyberpunk symbol sheet (cherry, bar, bell, lime, triangle, diamond, clover, 7, chrome skull, gold kanji, cyber skull, and a "W" wild), a button and menu inventory (spin, max bet, apply, next, auto 20×, how to play, cancel, resume, lobby, settings), and fully composed "READY" loading, main reel, and credits-panel screens in both **desktop and mobile** layouts. These give the team a concrete implementation target for the front end.

**Visual Identity Package (Thy Doan).** Layered on top of the wireframes: the **DATA HEIST** logo, the **Orbitron** typeface from Google Fonts, a curated Freesound asset set (spin sound, win sound, jackpot/big-win stinger, button click, and background music), and a complete color system:

- **Backgrounds** — `#0D0B1A` main, `#1A1528` card/reel, `#12101F` panel
- **Neon accents** — `#C8FF00` yellow-green (spin button and win highlights), `#FF2D78` magenta (wilds and payline labels), `#00FFD4` cyan (symbols and credits display), `#B44FFF` purple (chrome skull symbol), `#FFD700` gold (gold kanji symbol)
- **UI text** — `#FFFFFF` primary white, `#6B6480` muted gray-purple for inactive elements, `#00FF88` green for win amounts, `#FF4444` red for negative amounts
- **Borders and glows** — `#C8FF00` active reel border glow on the winning row, `#2A2040` subtle card border on symbol tiles

Together, these two deliverables mean the team is not starting from a blank canvas — the implementation can build directly against a shared visual reference.

---

## Team Roster

| Name | Role | Email | Contribution Area |
|---|---|---|---|
| Ethan Carter | Leader 1 | etcarter@ucsd.edu | Core slot machine structure & UI principles |
| Gabrielle Wang | Leader 2 | gaw004@ucsd.edu | Analysis of seven prominent slot titles |
| Benjamin Signer | Member | bsigner@ucsd.edu | App categories, monetization, regulation |
| Johnny Huang | Member | joh059@ucsd.edu | Player engagement features & visuals |
| Theo Lee | Member | thl030@ucsd.edu | Architecture & cyberpunk wireframes / mockups |
| Michael Marras | Member | mmarras@ucsd.edu | Qualitative player interview & persona |
| Bishal Khatri | Member | bikhatri@ucsd.edu | RTP, volatility, near-miss, auto-spin, user stories |
| Kareem Nabulsi | Member | knabulsi@ucsd.edu | Player demographics & LLM strategy |
| Thy Doan | Member | tndoan@ucsd.edu | Slot types & DATA HEIST visual identity package |
| Cindy Zhang | Member | ciz003@ucsd.edu | Retention mechanics & monetization patterns |
| Aarnav Gujjari | Member | agujjari@ucsd.edu | Explainable AI & regulatory frameworks |
| Nhan Tri Danh (Jack) | Member | ndanh@ucsd.edu | Core mechanics, RNG, symbol weighting |

---

## Individual Contributions

**Ethan Carter (Leader)** — Authored the high-level conceptual model of a slot machine: money in, random outcome rendered as flashy visuals, money out. Emphasized the importance of a cohesive theme tying the visuals together, an intuitive UI with the spin button as the clear focal point, secure and separated currency input, recognizable high-contrast symbols, and paylines that let players interpret their spin at a glance. Noted that RTP should favor the house only marginally because of regulation. Also contributed a user story on payline visibility.

**Gabrielle Wang (Leader)** — Wrote Section 7 of the domain research, analyzing seven prominent commercial slot titles (including Starburst, Dragon Link, Buffalo Gold, and 88 Fortunes). For each title she deconstructed grid layout, win-evaluation rules, and signature mechanics such as "Hold & Spin" and compounding multipliers, then mapped incentive structures (RTP, volatility, progressive jackpots) against the audiovisual feedback loops used to sustain engagement. Verified historical jackpot data (including the Wheel of Fortune vs. Megabucks record distinction) and sourced UI screenshots and paytables for reference. Gabby also maintains this `research-overview.md` file and contributed a user story.

**Benjamin Signer** — Mapped the entire slot app market into its two dominant categories: real-money apps and social/free-to-play casino apps. Documented licensing requirements, state-by-state legality (real-money is legal in only 8 states as of 2026), revenue models, RTP ranges, and typical player spending patterns (including the "whale" dynamic in social casinos). Also documented the sweepstakes casino grey area and the regulatory tightening against it, including California's recent restrictions. Contributed a user story and will be producing the final slide deck.

**Johnny Huang** — Focused his research on the central question: *why would anyone want to play a slot machine for hours?* He cataloged the engagement levers that turn a pure-luck game into something sticky — strong visuals and color, near-miss visual framing, accessible buy-in strategies like progressive jackpots and penny slots, gameplay modifiers such as wilds and bonus spins that vary the flow, and cultural framing like "hot" and "cold" machines. Also contributed visual assets and diagrams covering classic, video, and progressive jackpot slot categories.

**Theo Lee** — Wrote Sections 1–6 of the domain research, establishing the foundational system architecture. Traced the historical transition from fixed-probability mechanical hardware to software-defined RNG systems, and formalized the core design parameters (RTP, hit frequency, volatility, reel-to-payline data structures). Defined the canonical spin execution loop and cataloged extensions such as expanding wilds, cascading reel matrices, free-spin loops, and hold-and-spin respins. Classified the five standard win-evaluation models (Fixed Payline, Ways to Win, Cluster Pays, Megaways, Scatter arrays) and recommended the 5×3 grid with 20–25 paylines as the implementation baseline.

Beyond the written research, Theo also produced the first concrete visual direction for the project: a complete set of **Cyberpunk Slot Machine wireframes, assets, and mockups** for both desktop and mobile. The deliverable includes a full neon symbol sheet (cherry, bar, bell, lime, triangle, diamond, clover, 7, chrome skull, gold kanji, cyber skull, and a "W" wild), a button and menu inventory (spin, max bet, apply, next, auto 20×, how to play, cancel, resume, lobby, settings), and fully composed "READY" loading, main reel, and credits-panel screens in both desktop and mobile formats, plus the underlying wireframe grid that defines layout and information hierarchy. These mockups give the team a shared visual target to build against rather than a blank canvas.

**Michael Marras** — Took a qualitative approach, interviewing a friend while he played slot games and comparing a game he disliked to two he enjoyed (Gemza and a fishing-themed slot). His observations surfaced concrete design contrasts: static backgrounds feel boring even when payouts are good; lighting, motion, and color palette dramatically improve perceived quality; large animated wins with sound effects make payouts *feel* bigger than they are; and mechanics like cascading wins, multipliers, and mini-games are among the strongest engagement differentiators. Will also deliver the final presentation and contributed a persona document.

**Bishal Khatri** — Identified and documented mechanics missing from the team's initial research that are standard in real-world slot systems: Return to Player (RTP), volatility, the near-miss effect, auto-spin constraints (stop conditions for low balance or max spins), and win transparency (breaking down exactly how a payout was calculated). Also authored a comprehensive set of seven user stories with acceptance criteria covering balance tracking, adjustable betting, win feedback, payline transparency, fair RNG, auto-spin control, and win breakdown display.

**Kareem Nabulsi** — Wrote Section 8 of the domain research, building a demographic and behavioral profile of the core slot audience. Identified women aged 55–64 as the dominant demographic, debunked the low-income-gambler stereotype using median income and homeownership data, and surfaced the critical finding that ~5% of users generate up to 82% of casino slot revenue. Segmented players into "Utilitarian" and "Excitement" archetypes and established that over 60% of players are driven by the dopamine loop of small frequent wins rather than jackpot chasing. Also owns the LLM strategy for the project.

**Thy Doan** — Mapped the landscape of modern slot machine *types* — three-reel, video, penny, themed, and branded — documenting each one's features, popularity, and target audience. Concluded that video slots are the industry foundation and recommended the team build a themed slot machine with engaging bonus features and an accessible bet size.

Building on Theo's wireframes, Thy also assembled the **full visual identity package** for the cyberpunk direction. This includes the **DATA HEIST** logo; the **Orbitron** typeface from Google Fonts as the project typeface; a curated set of Freesound audio assets (spin sound, win sound, jackpot/big-win stinger, button click, and background music); and a complete color system — backgrounds (`#0D0B1A` main, `#1A1528` card/reel, `#12101F` panel), five neon accents (`#C8FF00` yellow-green for the spin button and win highlights, `#FF2D78` magenta for wilds and payline labels, `#00FFD4` cyan for symbols and credits, `#B44FFF` purple for the chrome skull, `#FFD700` gold for the kanji symbol), UI text colors (white primary, gray-purple muted, `#00FF88` win green, `#FF4444` loss red), and border/glow colors (`#C8FF00` active reel glow, `#2A2040` card border). Also contributed a persona and a user story.

**Cindy Zhang** — Researched the specific mechanics and design choices that keep players returning. Covered gameplay (randomness for replayability, uneven symbol value distribution, multiple game modes to prevent repetitiveness, daily/retention reward systems), visual design (eye-catching large visuals, simple intuitive UI, clear placement of balance and total wins), and monetization (the deliberate use of in-game currency as an abstraction layer that obscures real-money spending, plus time-limited discounts). Contributed a user story.

**Aarnav Gujjari** — Investigated the emerging regulatory pressure around explainable AI in slot machines, particularly in the EU and in forthcoming California law. Documented why interpretability matters (an AI that issues a deliberate near-miss to retain a player sits on the line between feature and manipulation) and introduced the two leading frameworks the industry is adopting: SHAP for game-theoretic feature attribution and LIME for fast per-spin human-readable explanations. This research positions the team to design for interpretability from the start rather than retrofitting it later.

**Nhan Tri Danh (Jack)** — Documented the core mechanics layer: reel counts, paylines (single in classic, thousands in modern), the fundamental role of the RNG in making each spin independent, and the importance of symbol weighting so that high-value symbols are statistically rarer than common ones. Also enumerated the feature set the team should build: adjustable bet size, credit/balance system, paytable, win animations with audio feedback, wilds, multipliers, free spins, auto-spin, and a bonus mini-game. Contributed a user story.

---

## Conclusion

Across twelve independent investigations, a consistent picture of the modern slot machine emerged. Mechanically, these are software systems built around an RNG, a weighted symbol set, and a paytable evaluated against one of a few standard win models — most commonly a 5×3 grid with 20–25 paylines. Mathematically, they are governed by RTP and volatility, two parameters that determine how the game pays out in aggregate and how it feels moment to moment.

What converts that machinery into something players engage with for hours is a dense layer of design choices that the research converged on with remarkable consistency: strong cohesive visual themes, bright recognizable symbols, a dominant and satisfying spin action, paylines that visibly explain wins, layered win celebrations, near-miss framing, gameplay modifiers (wilds, multipliers, cascades, bonus rounds), and accessible entry points such as penny bets and progressive jackpots. Retention beyond a single session is driven by daily bonuses, progression systems, and the carefully paced dopamine loop of small frequent wins that roughly 60% of players actually play for.

The research also surfaced concerns the team should take seriously. A small fraction of users accounts for the overwhelming majority of revenue, and AI-driven personalization in this space sits close to manipulation. Jurisdictions are already beginning to require interpretability, and good design here is both an ethical and regulatory concern.

Based on this body of research, our recommended direction is a **themed video slot** built on a 5×3 grid with standard paylines, featuring visible and transparent paylines, RNG-backed fair play with clear win breakdowns, accessible betting with auto-spin and its associated safety stops, multipliers and bonus mini-games for variety, and a visual and audio layer substantial enough to make wins feel meaningful. Where AI is used to shape the experience, its decisions should be logged and explainable from day one.

That direction has already been translated into a concrete artistic target. Theo's **Cyberpunk Slot Machine wireframes, assets, and desktop/mobile mockups** and Thy's **DATA HEIST visual identity package** — logo, Orbitron typography, curated Freesound audio, and the full neon-on-dark color system — give the team a shared reference to implement against, complete down to the hex codes for the active reel glow and the muted text color. Research, mechanics, and visual design now all point in the same direction.

With this foundation, the team can move from research into design and implementation with a shared, well-grounded understanding of what a good slot machine actually is — and what it should and should not do.
