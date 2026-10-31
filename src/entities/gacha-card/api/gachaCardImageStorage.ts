import {
  GACHA_CARD_IMAGE_EXTENSION,
  inspectGachaCardImageFile,
} from '@/entities/gacha-card/model/imageFile';
import {
  GACHA_CARD_IMAGES_BUCKET,
  resolveOwnedGachaCardImagePath,
} from '@/entities/gacha-card/model/imageStoragePath';
import { ENV } from '@/shared/config/env';
import { supabase } from '@/shared/api/supabase/client';

const COURSE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UploadGachaCardImageParams = {
  file: File;
  courseId: string;
};

export const uploadGachaCardImage = async ({
  file,
  courseId,
}: UploadGachaCardImageParams): Promise<{ publicUrl: string; path: string }> => {
  if (!COURSE_ID_PATTERN.test(courseId)) {
    throw new Error('Некорректный идентификатор курса');
  }

  const inspected = await inspectGachaCardImageFile(file);

  if ('error' in inspected) {
    throw new Error(inspected.error);
  }

  const path = `${courseId}/${crypto.randomUUID()}.${GACHA_CARD_IMAGE_EXTENSION[inspected.contentType]}`;
  const { error } = await supabase.storage.from(GACHA_CARD_IMAGES_BUCKET).upload(path, file, {
    upsert: false,
    contentType: inspected.contentType,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(GACHA_CARD_IMAGES_BUCKET).getPublicUrl(path);

  return {
    publicUrl: data.publicUrl,
    path,
  };
};

export const removeGachaCardImage = async (path: string) => {
  const { data, error } = await supabase.storage.from(GACHA_CARD_IMAGES_BUCKET).remove([path]);

  if (error || !data || data.length === 0) {
    throw error ?? new Error('Не удалось удалить файл изображения');
  }
};

export const deleteStoredGachaCardImageIfOwned = async (imageUrl: string, courseId: string) => {
  const path = resolveOwnedGachaCardImagePath(imageUrl, courseId, ENV.SUPABASE_URL);

  if (!path) {
    return;
  }

  await removeGachaCardImage(path);
};
