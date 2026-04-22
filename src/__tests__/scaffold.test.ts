import { describe, it, expect, expectTypeOf } from 'vitest';

import { SYMBOL_IDS, SYMBOL_META } from '../types/symbols';
import type { SymbolId } from '../types/symbols';
import type { SpinInput, SpinOutput, LineWin, SymbolGrid } from '../types/spin';
import type {
  BonusState,
  HeistState,
  FreeSpinsState,
  WildRespinState,
  CascadeStep,
  JackpotSnapshot,
  JackpotTier,
} from '../types/bonus';
import type { Credits, PackId, BetLevel, VipTier, SessionStats } from '../types/economy';
import type {
  WalletStore,
  JackpotCounter,
  ProgressionStore,
  AchievementsStore,
  VipStore,
  DailyBonusStore,
  PrivacyStore,
  ResponsiblePlayStore,
} from '../types/stores';
import type { GameEvent } from '../types/events';

import { palette, spacing, zIndex, durations } from '../theme/tokens';
import { SYMBOL_ASSETS } from '../theme/symbolAssets';

describe('P00 scaffold contracts', () => {
  it('exports 16 symbol ids and matching metadata', () => {
    expect(SYMBOL_IDS).toHaveLength(16);
    for (const id of SYMBOL_IDS) {
      expect(SYMBOL_META[id]).toBeDefined();
      expect(SYMBOL_META[id].id).toBe(id);
      expect(['low', 'mid', 'high', 'top', 'special']).toContain(SYMBOL_META[id].tier);
    }
  });

  it('palette pins the four required hex colors', () => {
    expect(palette.paylineMagenta).toBe('#FF2D78');
    expect(palette.spinNeon).toBe('#C8FF00');
    expect(palette.cardBg).toBe('#1A1528');
    expect(palette.textPrimary).toBe('#FFFFFF');
  });

  it('spacing and z-index scales are monotonically ordered', () => {
    const spaceSteps = [spacing.xxs, spacing.xs, spacing.sm, spacing.md, spacing.lg, spacing.xl];
    for (let i = 1; i < spaceSteps.length; i++) {
      expect(spaceSteps[i]).toBeGreaterThan(spaceSteps[i - 1]!);
    }
    expect(zIndex.modal).toBeGreaterThan(zIndex.winOverlay);
    expect(zIndex.ageGate).toBeGreaterThan(zIndex.modal);
  });

  it('win-tier durations match the P00 contract', () => {
    expect(durations.winTier).toEqual({
      small: 500,
      medium: 1200,
      big: 2500,
      mega: 4500,
      epic: 8000,
    });
  });

  it('symbol asset manifest has idle/win/dissolve paths for every symbol', () => {
    for (const id of SYMBOL_IDS) {
      const paths = SYMBOL_ASSETS[id];
      expect(paths.idle).toBe(`/assets/symbols/${id}.png`);
      expect(paths.win).toContain(id);
      expect(paths.dissolve).toContain(id);
    }
  });

  it('shared type exports are importable (compile-time check)', () => {
    expectTypeOf<SymbolId>().not.toBeAny();
    expectTypeOf<SpinInput>().not.toBeAny();
    expectTypeOf<SpinOutput>().not.toBeAny();
    expectTypeOf<LineWin>().not.toBeAny();
    expectTypeOf<SymbolGrid>().not.toBeAny();
    expectTypeOf<BonusState>().not.toBeAny();
    expectTypeOf<HeistState>().not.toBeAny();
    expectTypeOf<FreeSpinsState>().not.toBeAny();
    expectTypeOf<WildRespinState>().not.toBeAny();
    expectTypeOf<CascadeStep>().not.toBeAny();
    expectTypeOf<JackpotSnapshot>().not.toBeAny();
    expectTypeOf<JackpotTier>().not.toBeAny();
    expectTypeOf<Credits>().not.toBeAny();
    expectTypeOf<PackId>().not.toBeAny();
    expectTypeOf<BetLevel>().not.toBeAny();
    expectTypeOf<VipTier>().not.toBeAny();
    expectTypeOf<SessionStats>().not.toBeAny();
    expectTypeOf<WalletStore>().not.toBeAny();
    expectTypeOf<JackpotCounter>().not.toBeAny();
    expectTypeOf<ProgressionStore>().not.toBeAny();
    expectTypeOf<AchievementsStore>().not.toBeAny();
    expectTypeOf<VipStore>().not.toBeAny();
    expectTypeOf<DailyBonusStore>().not.toBeAny();
    expectTypeOf<PrivacyStore>().not.toBeAny();
    expectTypeOf<ResponsiblePlayStore>().not.toBeAny();
    expectTypeOf<GameEvent>().not.toBeAny();
  });
});
