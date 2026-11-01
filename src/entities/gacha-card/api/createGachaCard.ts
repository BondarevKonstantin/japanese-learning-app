import { supabase } from '@/shared/api/supabase/client';
import type { GachaCardRarity, GachaImageTransform } from '@/entities/gacha-card/model/types';

type CreateGachaCardParams = {
  courseId: string;
  title: string;
  imageStoragePath: string;
  imageTransform: GachaImageTransform;
  rarity: GachaCardRarity;
  createdBy: string;
};

export const createGachaCard = async ({
  courseId,
  title,
  imageStoragePath,
  imageTransform,
  rarity,
  createdBy,
}: CreateGachaCardParams) => {
  const { error } = await supabase.from('gacha_cards').insert({
    course_id: courseId,
    title,
    image_storage_path: imageStoragePath,
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
