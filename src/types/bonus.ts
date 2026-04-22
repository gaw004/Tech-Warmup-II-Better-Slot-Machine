import type { Credits } from './economy';
import type { LineWin, SymbolGrid } from './spin';

export type JackpotTier = 'chip' | 'disk' | 'vault' | 'mainframe';

export interface JackpotSnapshot {
  chip: Credits;
  disk: Credits;
  vault: Credits;
  mainframe: Credits;
  updatedAt: number;
}

export interface CascadeStep {
  gridBefore: SymbolGrid;
  wins: LineWin[];
  multiplier: number;
  gridAfter: SymbolGrid;
}

export interface FreeSpinsState {
  remaining: number;
  totalWon: Credits;
  maxRetriggerRemaining: number;
  globalMultiplier: 2;
}

export interface GridPosition {
  reel: number;
  row: number;
}

export interface WildRespinState {
  baseGrid: SymbolGrid;
  lockedWildPositions: readonly GridPosition[];
  newGrid: SymbolGrid;
}

export type TerminalValue =
  | { kind: 'credits'; amount: Credits }
  | { kind: 'multiplier'; value: 2 | 3 | 5 }
  | { kind: 'ice' }
  | { kind: 'jackpot' };

export interface TerminalSlot {
  index: number;
  value: TerminalValue;
  revealed: boolean;
}

export interface HeistState {
  terminals: TerminalSlot[];
  revealed: number[];
  iceHits: number;
  totalWon: Credits;
  jackpotHit?: JackpotTier;
  status: 'active' | 'ended';
}

export type BonusState =
  | { mode: 'base' }
  | { mode: 'freeSpins'; state: FreeSpinsState }
  | { mode: 'heist'; state: HeistState }
  | { mode: 'wildRespin'; state: WildRespinState }
  | { mode: 'cascading'; steps: CascadeStep[]; currentStepIndex: number };
