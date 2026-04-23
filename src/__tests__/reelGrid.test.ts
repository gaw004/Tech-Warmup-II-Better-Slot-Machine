import { describe, it, expect } from 'vitest';

import {
  REEL_GRID_CELL_GAP,
  REEL_GRID_CELL_SIZE,
  computePaylineGeometry,
  type Position,
} from '../ui/ReelGrid';
import { labelFor } from '../ui/SpinButton';

// These tests exercise the pure helpers inside the P14 components so they
// stay green under `vitest run` in the `node` environment (no DOM). The
// visual acceptance lives in the demo page; E2E coverage lands in P24.

describe('ReelGrid: computePaylineGeometry', () => {
  it('orders points left-to-right by reel', () => {
    const cells: Position[] = [
      { reel: 4, row: 2 },
      { reel: 0, row: 1 },
      { reel: 2, row: 0 },
    ];
    const geom = computePaylineGeometry(cells);
    expect(geom.nodes.map((n) => n.x)).toEqual([...geom.nodes].sort((a, b) => a.x - b.x).map((n) => n.x));
  });

  it('centres each node on its cell using default padding/gap constants', () => {
    const padding = 12;
    const cellStride = REEL_GRID_CELL_SIZE + REEL_GRID_CELL_GAP;
    const geom = computePaylineGeometry([
      { reel: 0, row: 0 },
      { reel: 1, row: 1 },
      { reel: 2, row: 2 },
    ]);
    expect(geom.nodes[0]).toEqual({
      x: padding + REEL_GRID_CELL_SIZE / 2,
      y: padding + REEL_GRID_CELL_SIZE / 2,
    });
    expect(geom.nodes[1]).toEqual({
      x: padding + cellStride + REEL_GRID_CELL_SIZE / 2,
      y: padding + cellStride + REEL_GRID_CELL_SIZE / 2,
    });
    expect(geom.nodes[2]).toEqual({
      x: padding + 2 * cellStride + REEL_GRID_CELL_SIZE / 2,
      y: padding + 2 * cellStride + REEL_GRID_CELL_SIZE / 2,
    });
  });

  it('emits an SVG polyline points string matching the node centres', () => {
    const geom = computePaylineGeometry([
      { reel: 0, row: 1 },
      { reel: 1, row: 1 },
    ]);
    const expected = geom.nodes.map((n) => `${n.x},${n.y}`).join(' ');
    expect(geom.points).toBe(expected);
  });
});

describe('SpinButton: labelFor', () => {
  it('shows the plain label when idle', () => {
    expect(labelFor({ label: 'Spin', busy: false, cooling: false, cooldown: 0 })).toEqual({
      primary: 'Spin',
    });
  });

  it('shows a "Rolling" secondary while busy', () => {
    expect(labelFor({ label: 'Spin', busy: true, cooling: false, cooldown: 0 })).toEqual({
      primary: 'Spin',
      secondary: 'Rolling',
    });
  });

  it('formats the cooldown countdown to one decimal second', () => {
    expect(labelFor({ label: 'Spin', busy: false, cooling: true, cooldown: 1250 })).toEqual({
      primary: '1.3s',
      secondary: 'Cooldown',
    });
    expect(labelFor({ label: 'Spin', busy: false, cooling: true, cooldown: 200 })).toEqual({
      primary: '0.2s',
      secondary: 'Cooldown',
    });
  });
});
