import type { SpinOutput } from './spin';
import type { Credits, PackId } from './economy';
import type { JackpotTier } from './bonus';

export type GameEvent =
  | { type: 'spin'; result: SpinOutput }
  | { type: 'freeSpinsStart'; count: number }
  | { type: 'freeSpinsEnd'; totalWon: Credits }
  | { type: 'heistStart' }
  | { type: 'heistEnd'; totalWon: Credits }
  | { type: 'jackpotHit'; tier: JackpotTier; amount: Credits }
  | { type: 'purchase'; packId: PackId }
  | { type: 'highBetConfirmRequest'; bet: Credits };

export type GameEventType = GameEvent['type'];
