export type SymbolId =
  | 'cherry'
  | 'lime'
  | 'watermelon'
  | 'bar'
  | 'bell'
  | 'horseshoe'
  | 'clover'
  | 'diamond'
  | 'neon7'
  | 'katana'
  | 'cyberIris'
  | 'chromeSkull'
  | 'goldKanji'
  | 'wild'
  | 'scatter'
  | 'bonus';

export type SymbolTier = 'low' | 'mid' | 'high' | 'top' | 'special';

export interface SymbolMeta {
  id: SymbolId;
  displayName: string;
  framing: string;
  tier: SymbolTier;
}

export const SYMBOL_IDS: readonly SymbolId[] = [
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
  'wild',
  'scatter',
  'bonus',
];

export const SYMBOL_META: Record<SymbolId, SymbolMeta> = {
  cherry: {
    id: 'cherry',
    displayName: 'Cherry',
    framing: 'Neon Cherry — classic fruit reborn in chrome.',
    tier: 'low',
  },
  lime: {
    id: 'lime',
    displayName: 'Lime',
    framing: 'Acid Lime — laboratory-green glow.',
    tier: 'low',
  },
  watermelon: {
    id: 'watermelon',
    displayName: 'Watermelon',
    framing: 'Synth Watermelon — pink static, glitched rind.',
    tier: 'low',
  },
  bar: {
    id: 'bar',
    displayName: 'BAR',
    framing: 'Signal BAR — the retro call-sign, re-encoded.',
    tier: 'low',
  },
  bell: {
    id: 'bell',
    displayName: 'Bell',
    framing: 'Broadcast Bell — the old alert tone of the net.',
    tier: 'mid',
  },
  horseshoe: {
    id: 'horseshoe',
    displayName: 'Horseshoe',
    framing: 'Luck Alloy — a horseshoe forged in chromed steel.',
    tier: 'mid',
  },
  clover: {
    id: 'clover',
    displayName: 'Clover',
    framing: 'Bio-Clover — engineered four-leaf, irrational luck.',
    tier: 'mid',
  },
  diamond: {
    id: 'diamond',
    displayName: 'Diamond',
    framing: 'Encrypted Diamond — data-crystal, unbreakable.',
    tier: 'high',
  },
  neon7: {
    id: 'neon7',
    displayName: 'Neon 7',
    framing: 'Neon 7 — the magic number in pink neon.',
    tier: 'high',
  },
  katana: {
    id: 'katana',
    displayName: 'Katana',
    framing: 'Monoblade Katana — edge-runner weapon of choice.',
    tier: 'high',
  },
  cyberIris: {
    id: 'cyberIris',
    displayName: 'Cyber Iris',
    framing: 'Cyber Iris — augmented optic, always watching.',
    tier: 'high',
  },
  chromeSkull: {
    id: 'chromeSkull',
    displayName: 'Chrome Skull',
    framing: 'Chrome Skull — posthuman memento mori.',
    tier: 'top',
  },
  goldKanji: {
    id: 'goldKanji',
    displayName: 'Gold Kanji',
    framing: 'Gold Kanji — the highest-paying character; jackpot on five.',
    tier: 'top',
  },
  wild: {
    id: 'wild',
    displayName: 'Wild',
    framing: 'GLITCH — wild substitute, corrupts any tile except scatter and bonus.',
    tier: 'special',
  },
  scatter: {
    id: 'scatter',
    displayName: 'Scatter',
    framing: 'SCATTER — trigger System Breach free spins from anywhere on the grid.',
    tier: 'special',
  },
  bonus: {
    id: 'bonus',
    displayName: 'Bonus',
    framing: 'BONUS — gateway to The Data Vault heist.',
    tier: 'special',
  },
};
