import type { Credits, PackId, VipTier, SessionStats, BetLevel } from './economy';
import type { JackpotSnapshot, JackpotTier } from './bonus';

export type Unsubscribe = () => void;

export interface Observable<TState> {
  getState(): TState;
  subscribe(listener: (state: TState) => void): Unsubscribe;
}

export interface WalletState {
  balance: Credits;
  lineBet: BetLevel;
  totalBet: Credits;
  lastWin: Credits;
  sessionStats: SessionStats;
}

export interface WalletStore extends Observable<WalletState> {
  setLineBet(level: BetLevel): void;
  maxBet(): void;
  deductStake(totalBet: Credits): boolean;
  creditWin(amount: Credits): void;
  addPurchase(packId: PackId): void;
}

export interface JackpotCounter extends Observable<JackpotSnapshot> {
  tick(nowMs: number): JackpotSnapshot;
  hit(tier: JackpotTier): Credits;
  snapshot(): JackpotSnapshot;
}

export interface ProgressionState {
  xp: number;
  level: number;
  unclaimedRewardLevels: number[];
}

export interface ProgressionStore extends Observable<ProgressionState> {
  grantXp(amount: number): void;
  claimLevelReward(level: number): Credits;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  rewardCc: Credits;
}

export interface AchievementsState {
  unlocked: ReadonlySet<string>;
  claimable: ReadonlySet<string>;
}

export interface AchievementsStore extends Observable<AchievementsState> {
  claimReward(achievementId: string): Credits;
}

export interface VipState {
  lifetimeWager: Credits;
  tier: VipTier;
}

export interface VipStore extends Observable<VipState> {
  addWager(amount: Credits): void;
}

export interface DailyBonusReward {
  day: number;
  cc: Credits;
  freeSpins?: number;
  heistEntry?: boolean;
}

export interface DailyBonusState {
  lastClaimTs: number | null;
  streakDay: number;
  canClaim: boolean;
  todaysReward: DailyBonusReward;
}

export interface DailyBonusStore extends Observable<DailyBonusState> {
  claim(): DailyBonusReward | null;
}

export interface PrivacyState {
  pinSet: boolean;
  locked: boolean;
  biometricAvailable: boolean;
  currentIconId: string;
}

export interface PrivacyStore extends Observable<PrivacyState> {
  setPin(pin: string): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
  lock(): void;
  unlock(): void;
  setAlternateIcon(iconId: string): void;
}

export interface ResponsiblePlayState {
  sessionStartedAt: number;
  reminderIntervalMin: number | null;
  dailyPlaytimeMin: number;
  dailyPlaytimeCapMin: number | null;
  dailySpend: Credits;
  dailySpendCap: Credits | null;
  highBetConfirmEnabled: boolean;
}

export interface ResponsiblePlayStore extends Observable<ResponsiblePlayState> {
  setReminderInterval(minutes: number | null): void;
  setDailyPlaytimeCap(minutes: number | null): void;
  setDailySpendCap(cc: Credits | null): void;
  setHighBetConfirmEnabled(enabled: boolean): void;
  recordSpendDelta(cc: Credits): void;
}
