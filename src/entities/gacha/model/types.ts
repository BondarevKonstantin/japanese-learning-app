import type { GachaCardRarity } from '@/entities/gacha-card/model/types';

export type CourseGachaConfigStatus = 'draft' | 'finalized';

export type CourseGachaConfig = {
  course_id: string;
  status: CourseGachaConfigStatus;
  cards_count: number | null;
  reward_lessons_count: number | null;
  pulls_per_lesson: number | null;
  cards_per_pull: number | null;
  total_pulls: number | null;
  total_drops: number | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

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

export type SpinGachaCardDrop = {
  id: string;
  title: string;
  image_url: string | null;
  rarity: GachaCardRarity;
  was_new: boolean;
  drop_number: number;
};

export type SpinGachaState = UserCourseGachaStateDto & {
  used_drops: number;
};

export type SpinGachaCollection = {
  unlocked_count: number;
  total_count: number;
  completed: boolean;
};

export type SpinGachaResult = {
  pull_number: number;
  cards: SpinGachaCardDrop[];
  state: SpinGachaState;
  collection: SpinGachaCollection;
};
