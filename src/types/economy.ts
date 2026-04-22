export type Credits = number;

export type PackId = 'starter' | 'small' | 'medium' | 'large' | 'mega' | 'whale';

export type BetLevel = 1 | 2 | 5 | 10 | 25 | 50 | 100;

export type VipTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'chromeJack';

export interface SessionStats {
  spins: number;
  wagered: Credits;
  won: Credits;
  netChange: Credits;
  startedAt: number;
}
