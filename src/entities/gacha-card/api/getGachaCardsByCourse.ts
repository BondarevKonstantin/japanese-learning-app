import { createGachaCardImageSignedUrls } from '@/entities/gacha-card/api/gachaCardImageStorage';
import { mapGachaCard } from '@/entities/gacha-card/lib/mapGachaCard';
import { mapGachaCardDescription } from '@/entities/gacha-card/lib/mapGachaCardDescription';
import type { GachaCardDescription, TeacherGachaCard } from '@/entities/gacha-card/model/types';
import { supabase } from '@/shared/api/supabase/client';

const getDescriptionsByCardId = async (
  cardIds: readonly string[],
): Promise<Map<string, GachaCardDescription>> => {
  if (cardIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('gacha_card_descriptions')
    .select('card_id, description')
    .in('card_id', [...cardIds]);

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data)) {
    throw new Error('Некорректный ответ описания карты');
  }

  const descriptions = new Map<string, GachaCardDescription>();

  for (const row of data) {
    const description = mapGachaCardDescription(row);
    descriptions.set(description.card_id, description);
  }

  return descriptions;
};

export const getGachaCardsByCourse = async (courseId: string): Promise<TeacherGachaCard[]> => {
  const { data, error } = await supabase
    .from('gacha_cards')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const cards = (data ?? []).map((row) => mapGachaCard(row));
  const descriptions = await getDescriptionsByCardId(cards.map((card) => card.id));
  const signedUrls = await createGachaCardImageSignedUrls(
    cards.map((card) => card.image_storage_path),
  );

  return cards.map((card) => {
    const imageUrl = signedUrls.get(card.image_storage_path);

    if (!imageUrl) {
      throw new Error('Не удалось создать ссылку на изображение карты');
    }

    return {
      ...card,
      image_url: imageUrl,
      description: descriptions.get(card.id) ?? null,
    };
  });
};
