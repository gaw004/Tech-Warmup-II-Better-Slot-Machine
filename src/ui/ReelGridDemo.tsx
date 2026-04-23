import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PAYLINES } from '../pureLogic/paylines';
import type { SymbolGrid } from '../types/spin';
import type { SymbolId } from '../types/symbols';
import { SYMBOL_IDS, SYMBOL_META } from '../types/symbols';
import { SYMBOL_ASSETS } from '../theme/symbolAssets';
import { durations } from '../theme/tokens';

import { ReelGrid, type Position } from './ReelGrid';
import { SpinButton } from './SpinButton';

import styles from './ReelGridDemo.module.css';

// P14 acceptance harness — Storybook-style demo page that:
//   1. Renders all 16 symbols in a gallery (“renders all symbols”).
//   2. Plays a fake spin via a self-managed `isSpinning` timeline.
//   3. Highlights a fake winning line (5 Gold Kanji across payline 0).
//   4. Shows a cascade dissolve on a hand-picked set of cells.
//
// This page mounts from App.tsx during development only. Once P23 lands, the
// GameController takes over and this file should be removed or routed behind
// a dev-only menu.

const STATIC_GRID: SymbolGrid = [
  ['cherry', 'bell', 'lime'],
  ['clover', 'diamond', 'neon7'],
  ['katana', 'cyberIris', 'bar'],
  ['horseshoe', 'watermelon', 'bonus'],
  ['chromeSkull', 'scatter', 'wild'],
] as const satisfies SymbolGrid;

const WINNING_GRID: SymbolGrid = [
  ['goldKanji', 'bell', 'lime'],
  ['goldKanji', 'diamond', 'neon7'],
  ['goldKanji', 'cyberIris', 'bar'],
  ['goldKanji', 'watermelon', 'bonus'],
  ['goldKanji', 'scatter', 'wild'],
] as const satisfies SymbolGrid;

const WINNING_LINE_CELLS: readonly Position[] = PAYLINES[1]!.map((row, reel) => ({
  reel,
  row,
}));

const CASCADE_CELLS: readonly Position[] = [
  { reel: 1, row: 1 },
  { reel: 2, row: 1 },
  { reel: 3, row: 1 },
  { reel: 3, row: 2 },
];

const SPIN_DURATION_MS = durations.reelSpin;

type Scene = 'idle' | 'winning' | 'cascading';

export function ReelGridDemo(): JSX.Element {
  const [grid, setGrid] = useState<SymbolGrid>(STATIC_GRID);
  const [isSpinning, setIsSpinning] = useState(false);
  const [scene, setScene] = useState<Scene>('idle');
  const [spinCount, setSpinCount] = useState(0);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const onSpin = useCallback(() => {
    if (isSpinning) return;
    // "Spin resolution must feel instantaneous at input (<100ms)" — we flip
    // isSpinning synchronously here; reel animation wraps around it.
    setScene('idle');
    setIsSpinning(true);
    spinTimerRef.current = setTimeout(() => {
      setGrid(nextDemoGrid(spinCount));
      setSpinCount((n) => n + 1);
      setIsSpinning(false);
    }, SPIN_DURATION_MS);
  }, [isSpinning, spinCount]);

  const showWinningLine = useCallback(() => {
    setGrid(WINNING_GRID);
    setScene('winning');
  }, []);

  const showCascade = useCallback(() => {
    setGrid(STATIC_GRID);
    setScene('cascading');
  }, []);

  const reset = useCallback(() => {
    setGrid(STATIC_GRID);
    setScene('idle');
  }, []);

  const winningCells = scene === 'winning' ? WINNING_LINE_CELLS : undefined;
  const cascadingCells = scene === 'cascading' ? CASCADE_CELLS : undefined;

  const statusLine = useMemo(
    () =>
      [
        `spins:       ${spinCount}`,
        `scene:       ${scene}`,
        `spinning:    ${isSpinning ? 'yes' : 'no'}`,
        `winCells:    ${winningCells ? winningCells.length : 0}`,
        `cascadeCells:${cascadingCells ? cascadingCells.length : 0}`,
      ].join('\n'),
    [spinCount, scene, isSpinning, winningCells, cascadingCells],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Data Heist — Reel Grid Demo</h1>
        <p className={styles.subtitle}>
          P14 acceptance harness · renders all symbols, plays a fake spin, highlights a fake
          winning line. Remove once P23 integration lands.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="gallery-title">
        <h2 id="gallery-title" className={styles.sectionTitle}>
          All 16 symbols
        </h2>
        <SymbolGallery />
      </section>

      <section className={styles.section} aria-labelledby="stage-title">
        <h2 id="stage-title" className={styles.sectionTitle}>
          Interactive stage
        </h2>
        <div className={styles.legend}>
          <span>
            <span className={`${styles.legendDot} ${styles.dotWin}`} />
            winning cell glow
          </span>
          <span>
            <span className={`${styles.legendDot} ${styles.dotLine}`} />
            payline overlay
          </span>
          <span>
            <span className={`${styles.legendDot} ${styles.dotCascade}`} />
            cascade pixel-dissolve
          </span>
        </div>
        <div className={styles.stage}>
          <ReelGrid
            grid={grid}
            isSpinning={isSpinning}
            winningCells={winningCells}
            cascadingCells={cascadingCells}
            ariaLabel="Demo reel grid"
          />
          <div className={styles.controls}>
            <SpinButton onSpin={onSpin} isSpinning={isSpinning} />
            <div className={styles.controlRow}>
              <button
                type="button"
                className={styles.toggleButton}
                onClick={showWinningLine}
                disabled={isSpinning}
              >
                Show winning line
              </button>
              <button
                type="button"
                className={styles.toggleButton}
                onClick={showCascade}
                disabled={isSpinning}
              >
                Show cascade
              </button>
              <button
                type="button"
                className={styles.toggleButton}
                onClick={reset}
                disabled={isSpinning}
              >
                Reset
              </button>
            </div>
            <pre className={styles.status}>{statusLine}</pre>
          </div>
        </div>
      </section>
    </div>
  );
}

function SymbolGallery(): JSX.Element {
  return (
    <div className={styles.gallery}>
      {SYMBOL_IDS.map((id) => {
        const meta = SYMBOL_META[id];
        const assets = SYMBOL_ASSETS[id];
        return (
          <div key={id} className={styles.galleryCell}>
            <div className={styles.galleryThumb}>
              <img
                src={assets.idle}
                alt=""
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className={styles.galleryThumbFallback}>{meta.displayName}</span>
            </div>
            <span className={styles.galleryName}>{meta.displayName}</span>
            <span className={styles.galleryTier}>{meta.tier}</span>
          </div>
        );
      })}
    </div>
  );
}

function nextDemoGrid(spinIndex: number): SymbolGrid {
  // Rotating column offset so successive demo spins visibly change the grid.
  const offset = (spinIndex + 1) * 3;
  const cols = Array.from({ length: 5 }, (_, reel) => {
    const base = (reel * 5 + offset) % SYMBOL_IDS.length;
    return [0, 1, 2].map((rowOffset) => {
      const idx = (base + rowOffset * 2) % SYMBOL_IDS.length;
      return SYMBOL_IDS[idx] as SymbolId;
    }) as unknown as readonly [SymbolId, SymbolId, SymbolId];
  });
  return cols as unknown as SymbolGrid;
}
