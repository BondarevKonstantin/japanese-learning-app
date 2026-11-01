import type { GachaCardRarity } from '@/entities/gacha-card/model/types';
import type {
  SpinGachaCardDrop,
  SpinGachaCollection,
  SpinGachaResult,
  SpinGachaState,
} from '@/entities/gacha/model/types';
import { supabase } from '@/shared/api/supabase/client';

const rarities: readonly GachaCardRarity[] = ['common', 'rare', 'epic', 'legendary'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isRarity = (value: unknown): value is GachaCardRarity =>
  typeof value === 'string' && rarities.some((rarity) => rarity === value);

const isSpinCard = (value: unknown): value is Omit<SpinGachaCardDrop, 'image_url'> =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string' &&
  typeof value.image_storage_path === 'string' &&
  isRarity(value.rarity) &&
  typeof value.was_new === 'boolean' &&
  typeof value.drop_number === 'number';

const isSpinState = (value: unknown): value is SpinGachaState =>
  isRecord(value) &&
  typeof value.available_pulls === 'number' &&
  typeof value.used_pulls === 'number' &&
  typeof value.used_drops === 'number' &&
  typeof value.total_pulls_earned === 'number';

const isSpinCollection = (value: unknown): value is SpinGachaCollection =>
  isRecord(value) &&
  typeof value.unlocked_count === 'number' &&
  typeof value.total_count === 'number' &&
  typeof value.completed === 'boolean';

const parseSpinGachaResult = (value: unknown): SpinGachaResult => {
  if (
    !isRecord(value) ||
    typeof value.pull_number !== 'number' ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isSpinCard) ||
    !isSpinState(value.state) ||
    !isSpinCollection(value.collection)
  ) {
    throw new Error('Некорректный ответ гачи');
  }

  return {
    pull_number: value.pull_number,
    cards: value.cards.map((card) => ({
      ...card,
      image_url: null,
    })),
    state: value.state,
    collection: value.collection,
  };
};

export async function spinGacha(courseId: string): Promise<SpinGachaResult> {
  const { data, error } = await supabase.rpc('spin_gacha', {
    p_course_id: courseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return parseSpinGachaResult(data);
}
