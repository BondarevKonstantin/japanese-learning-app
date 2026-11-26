import { createGachaCardImageSignedUrls } from '@/entities/gacha-card/api/gachaCardImageStorage';
import { parseGachaImageTransform } from '@/entities/gacha-card/model/imageTransform';
import type { GachaImageTransform } from '@/entities/gacha-card/model/types';
import type { SpinGachaCardDrop } from '@/entities/gacha/model/types';
import type { GachaReward } from '@/pages/gacha-play/model/gachaReward';
import { supabase } from '@/shared/api/supabase/client';

export type DroppedCardImagesResult = {
  signedUrls: ReadonlyMap<string, string> | null;
  transforms: ReadonlyMap<string, GachaImageTransform | null> | null;
  errorMessage: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim().length > 0 ? error.message.trim() : fallback;

const uniqueValues = (values: readonly string[]) => [
  ...new Set(values.filter((value) => value.length > 0)),
];

const readTransformRows = (value: unknown) => {
  if (!Array.isArray(value)) {
    throw new Error('Некорректный ответ трансформаций карт');
  }

  return value.map((row) => {
    if (!isRecord(row) || typeof row.id !== 'string' || !('image_transform' in row)) {
      throw new Error('Некорректный ответ трансформаций карт');
    }

    return {
      id: row.id,
      imageTransform: parseGachaImageTransform(row.image_transform),
    };
  });
};

/** Read-only. Does not spin, unlock cards, or change pull counters. */
const loadImageTransforms = async (cardIds: readonly string[]) => {
  const uniqueIds = uniqueValues(cardIds);

  if (uniqueIds.length === 0) {
    return new Map<string, GachaImageTransform | null>();
  }

  const { data, error } = await supabase
    .from('gacha_cards')
    .select('id, image_transform')
    .in('id', uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  const rows = readTransformRows(data);
  return new Map(rows.map((row) => [row.id, row.imageTransform]));
};

/**
 * Signed URLs and image_transform for cards that already dropped.
 * A failure here must not be treated as a failed spin.
 */
export const loadDroppedGachaCardImages = async (
  cards: readonly SpinGachaCardDrop[],
): Promise<DroppedCardImagesResult> => {
  const [signedOutcome, transformOutcome] = await Promise.allSettled([
    createGachaCardImageSignedUrls(cards.map((card) => card.image_storage_path)),
    loadImageTransforms(cards.map((card) => card.id)),
  ]);

  const errors: string[] = [];

  if (signedOutcome.status === 'rejected') {
    errors.push(errorText(signedOutcome.reason, 'Не удалось создать ссылки на изображения'));
  }

  if (transformOutcome.status === 'rejected') {
    errors.push(errorText(transformOutcome.reason, 'Не удалось загрузить положение изображений'));
  }

  return {
    signedUrls: signedOutcome.status === 'fulfilled' ? signedOutcome.value : null,
    transforms: transformOutcome.status === 'fulfilled' ? transformOutcome.value : null,
    errorMessage:
      errors.length > 0
        ? `${errors.join(' ')} Изображения можно загрузить ещё раз без новой крутки.`
        : '',
  };
};

export const mergeDroppedCardImages = (
  rewards: readonly GachaReward[],
  cards: readonly SpinGachaCardDrop[],
  loaded: DroppedCardImagesResult,
): GachaReward[] => {
  const pathByCardId = new Map<string, string>();

  for (const card of cards) {
    if (!pathByCardId.has(card.id)) {
      pathByCardId.set(card.id, card.image_storage_path);
    }
  }

  return rewards.map((reward) => {
    const nextReward = { ...reward };

    if (loaded.signedUrls) {
      const path = pathByCardId.get(reward.cardId);
      const signedUrl = path ? loaded.signedUrls.get(path) : undefined;

      if (signedUrl) {
        nextReward.imageUrl = signedUrl;
      }
    }

    if (loaded.transforms?.has(reward.cardId)) {
      nextReward.imageTransform = loaded.transforms.get(reward.cardId) ?? null;
    }

    return nextReward;
  });
};
