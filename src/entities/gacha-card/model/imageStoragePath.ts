export const GACHA_CARD_IMAGES_BUCKET = 'gacha-card-images';

const OWNED_OBJECT_PATH =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpe?g|webp))$/i;

export const resolveOwnedGachaCardImagePath = (
  imageStoragePath: string,
  courseId: string,
): string | null => {
  const match = OWNED_OBJECT_PATH.exec(imageStoragePath);

  if (!match || match[1].toLowerCase() !== courseId.toLowerCase()) {
    return null;
  }

  return `${match[1]}/${match[2]}`;
};
