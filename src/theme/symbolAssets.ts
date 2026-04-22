import type { SymbolId } from '../types/symbols';
import { SYMBOL_IDS } from '../types/symbols';

export interface SymbolAssetPaths {
  idle: string;
  win: string;
  dissolve: string;
}

const BASE_PATH = '/assets/symbols';

function placeholderPaths(id: SymbolId): SymbolAssetPaths {
  const path = `${BASE_PATH}/${id}.png`;
  return { idle: path, win: path, dissolve: path };
}

export const SYMBOL_ASSETS: Record<SymbolId, SymbolAssetPaths> = SYMBOL_IDS.reduce(
  (acc, id) => {
    acc[id] = placeholderPaths(id);
    return acc;
  },
  {} as Record<SymbolId, SymbolAssetPaths>,
);
