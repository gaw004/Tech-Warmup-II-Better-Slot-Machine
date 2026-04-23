import type { CSSProperties } from 'react';

import type { SymbolId, SymbolMeta } from '../types/symbols';
import { SYMBOL_META } from '../types/symbols';
import { PAYTABLE, scatterPayout } from '../pureLogic/paytable';
import { PAYLINES, type Payline } from '../pureLogic/paylines';

import { formatCredits } from './BottomBar';

import styles from './Paytable.module.css';

// P21 — Paytable screen. §10.3 calls out three content blocks: the full
// per-symbol payout table, the 25-line payline diagram, and the special-
// symbol explanations (wild / scatter / bonus). The screen is intentionally
// read-only and stateless — it pulls its data from P00's `SYMBOL_META`,
// P02's `PAYTABLE` / `scatterPayout`, and P02's `PAYLINES` so edits to any
// of those flow through automatically.
//
// Non-modal by default per §10.3 ("player can review while reels are
// visible"). The host controls whether it sits next to the reel grid, in a
// drawer, or as a takeover; this component renders a scrollable panel and
// delegates routing to `onClose` (when the host wants a back affordance).
//
// §10.2 "Paytable accessible at any time" — the component is decoupled from
// gameplay state so it can mount mid-spin without stopping reels.

/** Symbols that appear on paylines, in display order (low → top). */
export const PAYING_SYMBOL_IDS: readonly SymbolId[] = [
  'cherry',
  'lime',
  'watermelon',
  'bar',
  'bell',
  'horseshoe',
  'clover',
  'diamond',
  'neon7',
  'katana',
  'cyberIris',
  'chromeSkull',
  'goldKanji',
];

/** Special symbols that do not pay via the standard paytable rows. */
export const SPECIAL_SYMBOL_IDS: readonly SymbolId[] = ['wild', 'scatter', 'bonus'];

/** 5×3 layout constants for the payline diagram. */
const DIAGRAM_REELS = 5;
const DIAGRAM_ROWS = 3;
const DIAGRAM_CELL = 28;
const DIAGRAM_GAP = 8;
const DIAGRAM_PAD = 14;
const DIAGRAM_WIDTH = DIAGRAM_PAD * 2 + DIAGRAM_REELS * DIAGRAM_CELL + (DIAGRAM_REELS - 1) * DIAGRAM_GAP;
const DIAGRAM_HEIGHT = DIAGRAM_PAD * 2 + DIAGRAM_ROWS * DIAGRAM_CELL + (DIAGRAM_ROWS - 1) * DIAGRAM_GAP;

/**
 * Pure helper: the (x, y) center of cell (reel, row) in the diagram viewBox.
 * Exposed so the unit suite can assert the diagram math without rendering.
 */
export function diagramCellCenter(reel: number, row: number): { x: number; y: number } {
  const x = DIAGRAM_PAD + reel * (DIAGRAM_CELL + DIAGRAM_GAP) + DIAGRAM_CELL / 2;
  const y = DIAGRAM_PAD + row * (DIAGRAM_CELL + DIAGRAM_GAP) + DIAGRAM_CELL / 2;
  return { x, y };
}

/** Converts a payline to the SVG polyline `points` string. */
export function paylinePolylinePoints(line: Payline): string {
  return line
    .map((row, reel) => {
      const { x, y } = diagramCellCenter(reel, row);
      return `${x},${y}`;
    })
    .join(' ');
}

/** Tier-derived color hint for the paytable accent bar. */
function tierAccent(meta: SymbolMeta): string {
  switch (meta.tier) {
    case 'low':
      return 'var(--paytable-accent-low, #9a8fb8)';
    case 'mid':
      return 'var(--paytable-accent-mid, #37e29a)';
    case 'high':
      return 'var(--paytable-accent-high, #00e7f0)';
    case 'top':
      return 'var(--paytable-accent-top, #ffb020)';
    case 'special':
      return 'var(--paytable-accent-special, #ff2d78)';
  }
}

export interface PaytableProps {
  /** Host-provided back affordance. Omit for non-modal embedding. */
  onClose?: () => void;
  /** Optional highlight on the diagram; pass a line index 0..24. */
  highlightedLineIndex?: number | null;
  style?: CSSProperties;
  ariaLabel?: string;
}

/**
 * Full paytable screen. Renders:
 *   1. Header with an optional back button (non-modal hosts omit it).
 *   2. Paying-symbols grid (13 rows × {3×, 4×, 5×}).
 *   3. Special-symbols section with wild / scatter / bonus copy.
 *   4. 25-line payline diagram as inline SVG.
 */
export function Paytable({
  onClose,
  highlightedLineIndex = null,
  style,
  ariaLabel = 'Paytable',
}: PaytableProps): JSX.Element {
  return (
    <section
      className={styles.root}
      aria-label={ariaLabel}
      aria-modal={false}
      style={style}
    >
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Paytable</h2>
          <p className={styles.subtitle}>
            Line-bet multipliers · 25 fixed paylines · wins pay left-to-right from reel 1.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Return to game"
          >
            Back
          </button>
        )}
      </header>

      <section className={styles.panel} aria-labelledby="paytable-symbols-title">
        <h3 id="paytable-symbols-title" className={styles.panelTitle}>
          Symbol payouts
        </h3>
        <div className={styles.tableHeader} aria-hidden="true">
          <span>Symbol</span>
          <span className={styles.payCol}>3×</span>
          <span className={styles.payCol}>4×</span>
          <span className={styles.payCol}>5×</span>
        </div>
        <ul className={styles.symbolList}>
          {PAYING_SYMBOL_IDS.map((id) => (
            <SymbolRow key={id} id={id} />
          ))}
        </ul>
        <p className={styles.tableFootnote}>
          Payouts shown are multiples of the line bet. Gold Kanji five-of-a-kind pays the
          fixed jackpot (5,000× line bet).
        </p>
      </section>

      <section className={styles.panel} aria-labelledby="paytable-special-title">
        <h3 id="paytable-special-title" className={styles.panelTitle}>
          Special symbols
        </h3>
        <ul className={styles.specialList}>
          <SpecialSymbolRow
            id="wild"
            summary="Substitutes for every symbol except scatter and bonus."
            detail="Appears on reels 2–4. Pays as a standalone line symbol at 100 / 500 / 2,000 for 3 / 4 / 5. Triggers a Lockdown respin when two or more wilds land on a base-game spin."
          />
          <SpecialSymbolRow
            id="scatter"
            summary="Pays anywhere on the grid. Awards free spins on 3+."
            detail={`Pays ${formatCredits(scatterPayout(3))}× / ${formatCredits(scatterPayout(4))}× / ${formatCredits(scatterPayout(5))}× total bet for 3 / 4 / 5. 3 → 10 free spins, 4 → 15, 5 → 25. All free-spin wins are multiplied 2×; wilds expand to fill their column.`}
          />
          <SpecialSymbolRow
            id="bonus"
            summary="No direct payout. 3 on reels 1 / 3 / 5 unlocks The Data Vault."
            detail="Bonus symbols only appear on reels 1, 3, and 5. Hitting all three at once starts the Heist pick-em: 12 terminals hide credit prizes (10×–500× total bet), 2×/3×/5× multipliers, a rare progressive jackpot slot, and ICE traps — three ICE reveals ends the run."
          />
        </ul>
      </section>

      <section className={styles.panel} aria-labelledby="paytable-lines-title">
        <h3 id="paytable-lines-title" className={styles.panelTitle}>
          25 paylines
        </h3>
        <p className={styles.panelCopy}>
          Wins are evaluated left-to-right starting on reel 1. Each numbered line traces a
          fixed row pattern across the 5×3 grid.
        </p>
        <div className={styles.diagramRow}>
          <PaylineDiagram
            paylines={PAYLINES}
            highlightedLineIndex={highlightedLineIndex}
          />
          <ol className={styles.lineList} aria-label="Payline shapes">
            {PAYLINES.map((line, idx) => (
              <li
                key={idx}
                className={`${styles.lineChip} ${
                  highlightedLineIndex === idx ? styles.lineChipActive : ''
                }`.trim()}
              >
                <span className={styles.lineChipNumber}>{idx + 1}</span>
                <span className={styles.lineChipPattern} aria-hidden="true">
                  {line.map((row) => ['↑', '—', '↓'][row]).join(' ')}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </section>
  );
}

interface SymbolRowProps {
  id: SymbolId;
}

function SymbolRow({ id }: SymbolRowProps): JSX.Element {
  const meta = SYMBOL_META[id];
  const [k3, k4, k5] = PAYTABLE[id];
  return (
    <li className={styles.symbolRow}>
      <span className={styles.symbolAccent} style={{ background: tierAccent(meta) }} aria-hidden="true" />
      <span className={styles.symbolLabel}>
        <span className={styles.symbolName}>{meta.displayName}</span>
        <span className={styles.symbolFraming}>{meta.framing}</span>
      </span>
      <span className={styles.payCol}>{formatCredits(k3)}</span>
      <span className={styles.payCol}>{formatCredits(k4)}</span>
      <span className={styles.payCol}>{formatCredits(k5)}</span>
    </li>
  );
}

interface SpecialSymbolRowProps {
  id: Extract<SymbolId, 'wild' | 'scatter' | 'bonus'>;
  summary: string;
  detail: string;
}

function SpecialSymbolRow({ id, summary, detail }: SpecialSymbolRowProps): JSX.Element {
  const meta = SYMBOL_META[id];
  return (
    <li className={styles.specialRow} data-symbol={id}>
      <div className={styles.specialHead}>
        <span
          className={styles.specialBadge}
          style={{ borderColor: tierAccent(meta) }}
          aria-hidden="true"
        >
          {meta.displayName.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <div className={styles.specialName}>{meta.displayName}</div>
          <div className={styles.specialSummary}>{summary}</div>
        </div>
      </div>
      <p className={styles.specialDetail}>{detail}</p>
    </li>
  );
}

interface PaylineDiagramProps {
  paylines: readonly Payline[];
  highlightedLineIndex?: number | null;
}

/**
 * Inline SVG of the 5×3 grid with all 25 paylines overlaid. Each line is drawn
 * as a polyline between cell centers; the optional `highlightedLineIndex` lifts
 * one to full opacity for hover / mouseover styling from the host.
 */
export function PaylineDiagram({
  paylines,
  highlightedLineIndex = null,
}: PaylineDiagramProps): JSX.Element {
  return (
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}`}
      role="img"
      aria-label="25 payline diagram"
    >
      {Array.from({ length: DIAGRAM_REELS }).map((_, reel) =>
        Array.from({ length: DIAGRAM_ROWS }).map((_, row) => {
          const x = DIAGRAM_PAD + reel * (DIAGRAM_CELL + DIAGRAM_GAP);
          const y = DIAGRAM_PAD + row * (DIAGRAM_CELL + DIAGRAM_GAP);
          return (
            <rect
              key={`${reel}-${row}`}
              className={styles.diagramCell}
              x={x}
              y={y}
              width={DIAGRAM_CELL}
              height={DIAGRAM_CELL}
              rx={4}
            />
          );
        }),
      )}
      {paylines.map((line, idx) => (
        <polyline
          key={idx}
          className={`${styles.diagramLine} ${
            highlightedLineIndex === idx ? styles.diagramLineActive : ''
          }`.trim()}
          points={paylinePolylinePoints(line)}
        />
      ))}
    </svg>
  );
}
