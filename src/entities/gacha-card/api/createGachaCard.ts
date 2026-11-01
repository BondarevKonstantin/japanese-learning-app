import { supabase } from '@/shared/api/supabase/client';
import type { GachaCardRarity, GachaImageTransform } from '@/entities/gacha-card/model/types';

type CreateGachaCardParams = {
  courseId: string;
  title: string;
  description: string;
  imageStoragePath: string;
  imageTransform: GachaImageTransform;
  rarity: GachaCardRarity;
};

export const createGachaCard = async ({
  courseId,
  title,
  description,
  imageStoragePath,
  imageTransform,
  rarity,
}: CreateGachaCardParams) => {
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (trimmedTitle.length === 0) {
    throw new Error('Укажите название на японском');
  }

  if (trimmedDescription.length === 0) {
    throw new Error('Укажите описание');
  }

  const { error } = await supabase.rpc('create_gacha_card', {
    p_course_id: courseId,
    p_title: trimmedTitle,
    p_description: trimmedDescription,
    p_image_storage_path: imageStoragePath,
    p_image_transform: {
      scale: imageTransform.scale,
      offsetX: imageTransform.offsetX,
      offsetY: imageTransform.offsetY,
    },
    p_rarity: rarity,
  });

  if (error) {
    throw new Error(error.message);
  }
};
