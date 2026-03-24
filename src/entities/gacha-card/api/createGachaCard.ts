import { supabase } from '@/shared/api/supabase/client';
import type { GachaCardRarity } from '@/entities/gacha-card/model/types';

type CreateGachaCardParams = {
  courseId: string;
  title: string;
  imageUrl: string;
  rarity: GachaCardRarity;
  createdBy: string;
};

export const createGachaCard = async ({
  courseId,
  title,
  imageUrl,
  rarity,
  createdBy,
}: CreateGachaCardParams) => {
  const { error } = await supabase.from('gacha_cards').insert({
    course_id: courseId,
    title,
    image_url: imageUrl,
    rarity,
    created_by: createdBy,
  });

  if (error) {
    throw error;
  }
};
