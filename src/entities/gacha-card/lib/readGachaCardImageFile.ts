import { inspectGachaCardImageFile } from '@/entities/gacha-card/model/imageFile';
import type { ImageSize } from '@/entities/gacha-card/model/imageTransform';

const decodeGachaCardImageFile = async (file: File): Promise<ImageSize> => {
  try {
    const bitmap = await createImageBitmap(file);

    try {
      if (bitmap.width < 1 || bitmap.height < 1) {
        throw new Error('Не удалось прочитать изображение');
      }

      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Не удалось прочитать изображение') {
      throw error;
    }

    throw new Error('Не удалось прочитать изображение');
  }
};

export const readGachaCardImageFile = async (file: File): Promise<ImageSize> => {
  const inspected = await inspectGachaCardImageFile(file);

  if ('error' in inspected) {
    throw new Error(inspected.error);
  }

  return decodeGachaCardImageFile(file);
};
