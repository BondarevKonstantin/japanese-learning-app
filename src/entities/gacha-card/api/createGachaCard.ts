import { supabase } from '@/shared/api/supabase/client';
import type { GachaCardRarity, GachaImageTransform } from '@/entities/gacha-card/model/types';

type CreateGachaCardParams = {
  courseId: string;
  title: string;
  imageUrl: string;
  imageTransform: GachaImageTransform;
  rarity: GachaCardRarity;
  createdBy: string;
};

export const createGachaCard = async ({
  courseId,
  title,
  imageUrl,
  imageTransform,
  rarity,
  createdBy,
}: CreateGachaCardParams) => {
  const { error } = await supabase.from('gacha_cards').insert({
    course_id: courseId,
    title,
    image_url: imageUrl,
    image_transform: {
      scale: imageTransform.scale,
      offsetX: imageTransform.offsetX,
      offsetY: imageTransform.offsetY,
    },
    rarity,
    created_by: createdBy,
  });

  if (error) {
    throw error;
  }
};
