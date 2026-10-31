export const GACHA_CARD_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type GachaCardImageContentType = 'image/png' | 'image/jpeg' | 'image/webp';

export const GACHA_CARD_IMAGE_EXTENSION: Record<GachaCardImageContentType, 'png' | 'jpg' | 'webp'> =
  {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value);

export const detectGachaCardImageContentType = (
  bytes: Uint8Array,
): GachaCardImageContentType | null => {
  if (startsWith(bytes, PNG_SIGNATURE)) {
    return 'image/png';
  }

  if (startsWith(bytes, JPEG_SIGNATURE)) {
    return 'image/jpeg';
  }

  if (startsWith(bytes, RIFF_SIGNATURE) && startsWith(bytes, WEBP_SIGNATURE, 8)) {
    return 'image/webp';
  }

  return null;
};

export const inspectGachaCardImageFile = async (
  file: File,
): Promise<{ contentType: GachaCardImageContentType } | { error: string }> => {
  if (file.size <= 0) {
    return { error: 'Файл изображения пуст' };
  }

  if (file.size > GACHA_CARD_IMAGE_MAX_BYTES) {
    return { error: 'Изображение больше 5 МБ' };
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const contentType = detectGachaCardImageContentType(bytes);

  if (!contentType) {
    return { error: 'Можно выбрать только PNG, JPEG или WebP' };
  }

  return { contentType };
};
