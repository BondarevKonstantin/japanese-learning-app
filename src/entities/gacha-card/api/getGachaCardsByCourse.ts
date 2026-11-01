import { createGachaCardImageSignedUrls } from '@/entities/gacha-card/api/gachaCardImageStorage';
import { mapGachaCard } from '@/entities/gacha-card/lib/mapGachaCard';
import { supabase } from '@/shared/api/supabase/client';
import type { GachaCard } from '@/entities/gacha-card/model/types';

export const getGachaCardsByCourse = async (courseId: string): Promise<GachaCard[]> => {
  const { data, error } = await supabase
    .from('gacha_cards')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const cards = (data ?? []).map((row) => mapGachaCard(row));
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
    };
  });
};
