import type { GachaCard } from '@/entities/gacha-card/model/types';

export type GachaProgress = {
  unlocked: number;
  total: number;
  remaining: number;
  completed: boolean;
};

export type UserCourseGachaStateDto = {
  available_pulls: number;
  used_pulls: number;
  total_pulls_earned: number;
};

export type SpinMeta = {
  pull_number: number;
  target_rarity: string;
  actual_rarity: string;
};

export type SpinGachaResult = {
  card: GachaCard;
  progress: GachaProgress;
  state: UserCourseGachaStateDto;
  meta: SpinMeta;
};
