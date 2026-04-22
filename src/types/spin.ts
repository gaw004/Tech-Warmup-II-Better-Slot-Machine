import type { SymbolId } from './symbols';
import type { Credits } from './economy';

export type SymbolColumn = readonly [SymbolId, SymbolId, SymbolId];

export type SymbolGrid = readonly [
  SymbolColumn,
  SymbolColumn,
  SymbolColumn,
  SymbolColumn,
  SymbolColumn,
];

export interface SpinInput {
  lineBet: Credits;
  totalBet: Credits;
  seed?: number;
}

export interface LineWin {
  lineIndex: number;
  symbol: SymbolId;
  count: 3 | 4 | 5;
  multiplier: number;
  credits: Credits;
}

export interface SpinTriggers {
  freeSpins?: number;
  heist?: boolean;
  wildRespin?: boolean;
  fixedJackpot?: boolean;
}

export interface SpinOutput {
  grid: SymbolGrid;
  wins: LineWin[];
  scatterWin: Credits;
  totalWin: Credits;
  triggers: SpinTriggers;
}
