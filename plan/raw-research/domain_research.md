# Slot Machine Domain Research

Domain research document for the Tech Warmup II: Better Slot Machine project.

---

## Table of Contents

1. [Domain Overview](#1-domain-overview)
2. [Historical Evolution](#2-historical-evolution)
3. [Core Components](#3-core-components)
4. [Game Mechanics](#4-game-mechanics)
5. [Rule Systems (Win Evaluation Rules)](#5-rule-systems-win-evaluation-rules)
6. [Math Model](#6-math-model)

---

## 1. Domain Overview

A slot machine is a probability-based betting game that determines outcomes and payouts from symbol combinations on spinning reels. It exists in physical (land-based) and digital (online/mobile) forms, and at its core is a Random Number Generator (RNG) that produces results.

---

## 2. Historical Evolution

| Era     | Technology                     | Representative                                            |
| ------- | ------------------------------ | --------------------------------------------------------- |
| 1891    | Mechanical                     | Sittman & Pitt (NYC, poker machine)                       |
| 1895    | Mechanical 3-reel              | Charles Fey's Liberty Bell, the prototype of modern slots |
| 1960s   | Electromechanical              | Bally "Money Honey" (automatic payout)                    |
| 1976    | Video slot                     | Fortune Coin (Las Vegas)                                  |
| 1996+   | Online                         | Microgaming, NetEnt                                       |
| 2010+   | Mobile / HTML5                 | Play'n GO, Pragmatic Play                                 |
| Present | Megaways, VR, blockchain slots | Big Time Gaming and others                                |

The key evolutionary shift: mechanical fixed probability moved to a programmable RNG. This made paytables and volatility freely configurable at the software level.

---

## 3. Core Components

| Component              | Description                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Reel                   | A spinning strip of symbols. Typically 3 or 5 reels                                             |
| Symbol                 | Images on the reel. Types include Regular, Wild (substitute), Scatter (trigger), Bonus          |
| Payline                | Winning judgment path. 1 line, 5 lines, 25 lines, 243 ways, up to Megaways (117,649 ways)       |
| Paytable               | Payout table for symbol combinations                                                            |
| RNG                    | Random number generator that decides outcomes. Usually Mersenne Twister or a cryptographic PRNG |
| RTP (Return to Player) | Long-term return rate, typically 90 to 98%. Legal minimums vary by jurisdiction                 |
| Volatility / Variance  | Trade-off between win frequency and size. Low (small frequent wins) vs High (large rare wins)   |
| Hit Frequency          | Probability of winning per spin, commonly 20 to 50%                                             |
| Bet Level              | Wager amount per spin                                                                           |
| Balance / Credits      | Player's available funds                                                                        |

---

## 4. Game Mechanics

### Core Loop

```
Bet input → Spin trigger → RNG call → Reel result determination
          → Payline evaluation → Payout / animation → State update
```

### Bonus Features (Extension Points)

- Free Spins: triggered by N scatter symbols, awards a set of free spins
- Multiplier: winnings multiplier (x2, x3, ...)
- Wild variants: Expanding, Sticky, Walking, Stacked Wild
- Cascading / Tumbling Reels: winning symbols are removed and new ones drop in (Candy Crush style)
- Pick Bonus: mini-game with selectable prizes
- Hold & Spin / Respin: specific symbols lock while reels re-spin
- Progressive Jackpot: accumulating jackpot (Standalone / Local / Wide-area)
- Gamble / Double-up: double-or-nothing feature on winnings

---

## 5. Rule Systems (Win Evaluation Rules)

### 5.1 Five Major Win Evaluation Rules

| #   | Rule               | Description                                                                           | Examples                                     |
| --- | ------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Fixed Payline      | Matching symbols connect along predefined N lines, left to right. Betting is per line | Classic 3-reel slots, most early video slots |
| 2   | Ways to Win        | No payline concept. Matching symbols anywhere on adjacent reels count as a win        | NetEnt "243 ways", Microgaming "1024 ways"   |
| 3   | Cluster Pays       | Groups of 5 or more identical symbols connected orthogonally on the grid              | NetEnt "Aloha!", Push Gaming "Jammin' Jars"  |
| 4   | Megaways           | Symbol count per reel changes randomly each spin, so ways are dynamic (up to 117,649) | Big Time Gaming's patented engine            |
| 5   | Scatter / All-Pays | N or more matching symbols anywhere on screen pay out                                 | Pragmatic "Gates of Olympus"                 |

### 5.2 Modifiers (Combined with the Five Rules Above)

- Both-ways pay (bidirectional matching)
- Cascading / Tumbling reels (winning symbols removed, cascading wins)
- Hold & Win / Respin
- Multiplier, Wild, Scatter, Bonus symbol systems

### 5.3 Rule Availability by Reel Count

Reel count effectively limits which rules are viable:

| Reel Count                  | Typical Rules                                                     | Characteristics                                                              |
| --------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 3-reel (3×3 or 3×1)         | Fixed Payline (1 to 5 lines)                                      | Simple, high volatility, classic "fruit machine" feel. Ways/Cluster are rare |
| 5-reel (5×3 or 5×4)         | Fixed Payline (9 to 50), 243 Ways, Cluster, Megaways all possible | Mainstream in modern video slots. Most flexible format                       |
| 6-reel (6×4, 6×5, etc.)     | 1024 to 4096 Ways, Cluster pays, Megaways                         | Increasingly common since the late 2010s                                     |
| 6 to 7-reel grid (6×5, 7×7) | Mostly Cluster pays, Scatter / All-pays                           | Standard for grid-style slots                                                |
| Asymmetric reels            | Megaways (2 to 7 symbols per reel, variable)                      | Based on BTG patent                                                          |

Key points:

- On 3-reel slots, Fixed Payline is effectively the only realistic rule. Ways and Cluster rules are dull with so few symbols
- From 5-reel upward, all rules become possible, which is the default for modern slots
- 6-reel slots and square grids (7×7) pair well with Cluster pays

---

## 6. Math Model

1. Symbol Distribution: how many times each symbol appears on each reel (reel strip design)

2. Probability Matrix: probability calculation for each combination

3. RTP calculation
   
   ```
   RTP = Σ (probability × payout) / bet
   ```

4. Volatility tuning: adjusting variance (σ²) to shape play experience

5. Simulation verification: typically 10 million to 1 billion Monte Carlo spins to confirm RTP convergence

Note: RTP and Hit Frequency are independent design parameters. Two games with the same 96% RTP can feel completely different: "small frequent wins" vs "rare big wins".

---

*This document serves as the team's shared domain knowledge base. Reviews and edits welcome.*
