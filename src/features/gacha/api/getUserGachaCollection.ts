import { createGachaCardImageSignedUrls } from '@/entities/gacha-card/api/gachaCardImageStorage';
import { mapGachaCard } from '@/entities/gacha-card/lib/mapGachaCard';
import { supabase } from '@/shared/api/supabase/client';
import type { GachaCard } from '@/entities/gacha-card/model/types';

export type UserGachaCollectionItem = GachaCard & {
  isUnlocked: boolean;
  unlockedAt: string | null;
};

export const getUserGachaCollection = async (
  courseId: string,
  userId: string,
): Promise<UserGachaCollectionItem[]> => {
  const { data: cards, error: cardsError } = await supabase
    .from('gacha_cards')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });

  if (cardsError) {
    throw new Error(cardsError.message);
  }

  const { data: unlockedCards, error: unlockedError } = await supabase
    .from('user_unlocked_cards')
    .select('card_id, unlocked_at')
    .eq('course_id', courseId)
    .eq('user_id', userId);

  if (unlockedError) {
    throw new Error(unlockedError.message);
  }

  const unlockedMap = new Map(
    (unlockedCards ?? []).map((item) => [item.card_id, item.unlocked_at]),
  );

  const items = (cards ?? []).map((card) => {
    const mappedCard = mapGachaCard(card);

    return {
      ...mappedCard,
      isUnlocked: unlockedMap.has(mappedCard.id),
      unlockedAt: unlockedMap.get(mappedCard.id) ?? null,
    };
  });

  const signedUrls = await createGachaCardImageSignedUrls(
    items.filter((item) => item.isUnlocked).map((item) => item.image_storage_path),
  );

  return items.map((item) => {
    if (!item.isUnlocked) {
      return {
        ...item,
        image_url: null,
      };
    }

    const imageUrl = signedUrls.get(item.image_storage_path);

    if (!imageUrl) {
      throw new Error('Не удалось создать ссылку на изображение открытой карты');
    }

    return {
      ...item,
      image_url: imageUrl,
    };
  });
};
