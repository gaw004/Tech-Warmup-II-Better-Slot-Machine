import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import type { SymbolGrid } from '../types/spin';
import type { SymbolId } from '../types/symbols';
import { SYMBOL_IDS, SYMBOL_META } from '../types/symbols';
import { SYMBOL_ASSETS } from '../theme/symbolAssets';
import { durations } from '../theme/tokens';

import styles from './ReelGrid.module.css';

// P14 — renders a 5×3 grid from a `SymbolId[5][3]` prop, driven by a handful
// of props that the orchestrator (P23 GameController, not here) owns. The
// component is deliberately dumb: it does not know about spins, evaluations,
// or the wallet — only about rendering a grid and animating transitions.
//
// Animation strategy:
// - Rolling: each reel clips a vertical strip of tiles translating upward. The
//   strip contains three copies of the final column so the loop is seamless.
// - Landing: reels stop left-to-right with a `durations.reelStopStagger` gap.
//   Each freshly landed cell plays a one-shot bounce.
// - Winning cells: cyan-green inset glow (`palette.spinNeon`), per §10.1.
// - Winning payline: magenta SVG overlay connecting the winning cell centres
//   (`palette.paylineMagenta`), per §8.3 / §10.1.
// - Cascading cells: pixel-dissolve keyframes, per §6.2. The parent is
//   responsible for clearing `cascadingCells` and updating `grid` once the
//   dissolve completes.

const REEL_COUNT = 5;
const ROW_COUNT = 3;

// The demo uses the CSS defaults; exposed here so pure-function tests and
// parent overrides agree on geometry without having to parse the CSS.
export const REEL_GRID_CELL_SIZE = 88;
export const REEL_GRID_CELL_GAP = 6;

// A single cell's logical address on the grid. Reel 0 is the left-most column
// and row 0 is the top row, matching `grid[reel][row]` in P00/P02.
export interface Position {
  reel: number;
  row: number;
}

export interface ReelGridProps {
  grid: SymbolGrid;
  isSpinning: boolean;
  winningCells?: readonly Position[];
  cascadingCells?: readonly Position[];
  onAnimationComplete?: () => void;
  /** CSS overrides — e.g. a parent that wants larger tiles on desktop. */
  style?: CSSProperties;
  /** Accessible label for the grid region. */
  ariaLabel?: string;
}

/**
 * 5×3 reel grid with staggered spin-stop animation and win highlighting.
 * Purely presentational — P23's GameController owns the spin state.
 */
export function ReelGrid({
  grid,
  isSpinning,
  winningCells,
  cascadingCells,
  onAnimationComplete,
  style,
  ariaLabel = 'Reel grid',
}: ReelGridProps): JSX.Element {
  // Per-reel landing flag. When a spin starts, all reels roll; when a spin
  // ends, each reel lands after `index × reelStopStagger` ms.
  const [landed, setLanded] = useState<boolean[]>(() => initialLanded(isSpinning));
  const prevSpinning = useRef(isSpinning);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const prev = prevSpinning.current;
    prevSpinning.current = isSpinning;

    // Clear any in-flight landing sequence on every transition; otherwise a
    // rapid spin→stop→spin would leave stale timers that flip reels later.
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];

    if (!prev && isSpinning) {
      setLanded(Array(REEL_COUNT).fill(false));
      return;
    }

    if (prev && !isSpinning) {
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      for (let r = 0; r < REEL_COUNT; r++) {
        timeouts.push(
          setTimeout(() => {
            setLanded((cur) => {
              const next = cur.slice();
              next[r] = true;
              return next;
            });
          }, r * durations.reelStopStagger),
        );
      }
      timeouts.push(
        setTimeout(
          () => {
            onAnimationComplete?.();
          },
          (REEL_COUNT - 1) * durations.reelStopStagger + 260,
        ),
      );
      timeoutsRef.current = timeouts;
    }
  }, [isSpinning, onAnimationComplete]);

  useEffect(() => {
    return () => {
      for (const t of timeoutsRef.current) clearTimeout(t);
    };
  }, []);

  const winningSet = useMemo(() => positionSet(winningCells), [winningCells]);
  const cascadingSet = useMemo(() => positionSet(cascadingCells), [cascadingCells]);

  const payline = useMemo(
    () => (winningCells && winningCells.length >= 2 ? computePaylineGeometry(winningCells) : null),
    [winningCells],
  );

  return (
    <div
      className={styles.root}
      role="group"
      aria-label={ariaLabel}
      style={style}
      data-spinning={isSpinning ? 'true' : 'false'}
    >
      {grid.map((column, reelIdx) => (
        <Reel
          key={reelIdx}
          reelIdx={reelIdx}
          column={column}
          rolling={isSpinning && !landed[reelIdx]}
          justLanded={!isSpinning && landed[reelIdx]}
          winningSet={winningSet}
          cascadingSet={cascadingSet}
        />
      ))}
      {payline && !isSpinning && (
        <svg
          className={styles.paylineOverlay}
          viewBox={`0 0 ${payline.width} ${payline.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline className={styles.paylineStroke} points={payline.points} />
          {payline.nodes.map((n, i) => (
            <circle key={i} className={styles.paylineNode} cx={n.x} cy={n.y} r={5} />
          ))}
        </svg>
      )}
    </div>
  );
}

interface ReelProps {
  reelIdx: number;
  column: SymbolGrid[number];
  rolling: boolean;
  justLanded: boolean;
  winningSet: ReadonlySet<string>;
  cascadingSet: ReadonlySet<string>;
}

function Reel({
  reelIdx,
  column,
  rolling,
  justLanded,
  winningSet,
  cascadingSet,
}: ReelProps): JSX.Element {
  // While rolling, show three repeats of the final column for a seamless loop
  // with random filler on the trailing copies so the motion reads as varied.
  const stripTiles = rolling ? buildRollingStripTiles(column, reelIdx) : column;

  return (
    <div className={styles.reel} role="list" aria-label={`Reel ${reelIdx + 1}`}>
      <div
        className={`${styles.reelStrip} ${rolling ? styles.reelStripRolling : ''}`.trim()}
      >
        {stripTiles.map((id, i) => {
          const rowIdx = rolling ? -1 : i;
          const key = `${reelIdx}:${i}:${id}`;
          const isWinning = !rolling && winningSet.has(cellKey(reelIdx, rowIdx));
          const isCascading = !rolling && cascadingSet.has(cellKey(reelIdx, rowIdx));
          return (
            <SymbolTile
              key={key}
              id={id}
              isWinning={isWinning}
              isCascading={isCascading}
              playBounce={justLanded && !rolling}
            />
          );
        })}
      </div>
    </div>
  );
}

interface SymbolTileProps {
  id: SymbolId;
  isWinning: boolean;
  isCascading: boolean;
  playBounce: boolean;
}

function SymbolTile({ id, isWinning, isCascading, playBounce }: SymbolTileProps): JSX.Element {
  const meta = SYMBOL_META[id];
  const assets = SYMBOL_ASSETS[id];
  const className = [
    styles.cell,
    playBounce ? styles.cellLanding : '',
    isWinning ? styles.cellWinning : '',
    isCascading ? styles.cellCascading : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} role="listitem" aria-label={meta.displayName} data-symbol={id}>
      <img
        className={styles.cellImg}
        src={assets.idle}
        alt=""
        // Placeholder art may not ship with the repo; hide the broken image
        // and let the text label carry the demo.
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className={styles.cellLabel}>{shortLabel(meta.displayName)}</span>
    </div>
  );
}

function shortLabel(name: string): string {
  if (name.length <= 8) return name;
  return `${name.slice(0, 7)}…`;
}

function initialLanded(isSpinning: boolean): boolean[] {
  return Array(REEL_COUNT).fill(!isSpinning);
}

function cellKey(reel: number, row: number): string {
  return `${reel}:${row}`;
}

function positionSet(cells?: readonly Position[]): ReadonlySet<string> {
  if (!cells || cells.length === 0) return EMPTY_SET;
  const s = new Set<string>();
  for (const c of cells) s.add(cellKey(c.reel, c.row));
  return s;
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

function buildRollingStripTiles(
  column: SymbolGrid[number],
  reelIdx: number,
): readonly SymbolId[] {
  // Three copies of the final column → seamless loop. The middle copy is
  // randomised (seeded by reel index) to make the motion feel less mechanical.
  const middle = randomisedMiddleRow(reelIdx);
  return [...column, ...middle, ...column];
}

function randomisedMiddleRow(reelIdx: number): readonly SymbolId[] {
  // Deterministic per reel so renders stay stable across React re-renders
  // inside the same rolling pass.
  const picks: SymbolId[] = [];
  for (let i = 0; i < ROW_COUNT; i++) {
    picks.push(SYMBOL_IDS[(reelIdx * 7 + i * 3) % SYMBOL_IDS.length]!);
  }
  return picks;
}

export interface PaylineGeometry {
  points: string;
  nodes: readonly { x: number; y: number }[];
  width: number;
  height: number;
}

/**
 * Computes the SVG polyline geometry connecting the centres of the given
 * cells, ordered left-to-right by reel. Exported so tests can verify path
 * maths without rendering the DOM.
 */
export function computePaylineGeometry(
  cells: readonly Position[],
  cellSize = REEL_GRID_CELL_SIZE,
  cellGap = REEL_GRID_CELL_GAP,
  containerPadding = 12,
): PaylineGeometry {
  const sorted = cells.slice().sort((a, b) => a.reel - b.reel);
  const width = REEL_COUNT * cellSize + (REEL_COUNT - 1) * cellGap + 2 * containerPadding;
  const height = ROW_COUNT * cellSize + (ROW_COUNT - 1) * cellGap + 2 * containerPadding;
  const nodes = sorted.map((c) => ({
    x: containerPadding + c.reel * (cellSize + cellGap) + cellSize / 2,
    y: containerPadding + c.row * (cellSize + cellGap) + cellSize / 2,
  }));
  const points = nodes.map((n) => `${n.x},${n.y}`).join(' ');
  return { points, nodes, width, height };
}
