export const GACHA_CARD_IMAGES_BUCKET = 'gacha-card-images';

const PUBLIC_OBJECT_PREFIX = `/storage/v1/object/public/${GACHA_CARD_IMAGES_BUCKET}/`;
const OWNED_OBJECT_PATH =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpe?g|webp))$/i;

export const resolveOwnedGachaCardImagePath = (
  imageUrl: string,
  courseId: string,
  supabaseUrl: string,
): string | null => {
  let url: URL;
  let projectUrl: URL;

  try {
    url = new URL(imageUrl);
    projectUrl = new URL(supabaseUrl);
  } catch {
    return null;
  }

  if (url.origin !== projectUrl.origin || !url.pathname.startsWith(PUBLIC_OBJECT_PREFIX)) {
    return null;
  }

  let objectPath: string;

  try {
    objectPath = decodeURIComponent(url.pathname.slice(PUBLIC_OBJECT_PREFIX.length));
  } catch {
    return null;
  }

  const match = OWNED_OBJECT_PATH.exec(objectPath);

  if (!match || match[1].toLowerCase() !== courseId.toLowerCase()) {
    return null;
  }

  return `${match[1]}/${match[2]}`;
};
