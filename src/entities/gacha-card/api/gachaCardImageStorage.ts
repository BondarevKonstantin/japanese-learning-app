import {
  GACHA_CARD_IMAGE_EXTENSION,
  inspectGachaCardImageFile,
} from '@/entities/gacha-card/model/imageFile';
import {
  GACHA_CARD_IMAGES_BUCKET,
  resolveOwnedGachaCardImagePath,
} from '@/entities/gacha-card/model/imageStoragePath';
import { supabase } from '@/shared/api/supabase/client';

const COURSE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GACHA_CARD_IMAGE_SIGNED_URL_TTL_SECONDS = 300;

type UploadGachaCardImageParams = {
  file: File;
  courseId: string;
};

type SignedUrlResult = {
  error: string | null;
  path: string | null;
  signedUrl: string | null;
};

const uniquePaths = (paths: readonly string[]) => [...new Set(paths.filter((path) => path.length > 0))];

export const uploadGachaCardImage = async ({
  file,
  courseId,
}: UploadGachaCardImageParams): Promise<{ path: string }> => {
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

  return { path };
};

export const createGachaCardImageSignedUrl = async (path: string): Promise<string> => {
  const signedUrls = await createGachaCardImageSignedUrls([path]);
  const signedUrl = signedUrls.get(path);

  if (!signedUrl) {
    throw new Error('Не удалось создать ссылку на изображение');
  }

  return signedUrl;
};

export const createGachaCardImageSignedUrls = async (
  paths: readonly string[],
): Promise<Map<string, string>> => {
  const requestedPaths = uniquePaths(paths);

  if (requestedPaths.length === 0) {
    return new Map();
  }

  const singlePath = requestedPaths.length === 1 ? requestedPaths[0] : null;

  if (singlePath) {
    const { data, error } = await supabase.storage
      .from(GACHA_CARD_IMAGES_BUCKET)
      .createSignedUrl(singlePath, GACHA_CARD_IMAGE_SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? 'Не удалось создать ссылку на изображение');
    }

    return new Map([[singlePath, data.signedUrl]]);
  }

  const { data, error } = await supabase.storage
    .from(GACHA_CARD_IMAGES_BUCKET)
    .createSignedUrls(requestedPaths, GACHA_CARD_IMAGE_SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    throw new Error(error?.message ?? 'Не удалось создать ссылки на изображения');
  }

  return collectSignedUrls(requestedPaths, data);
};

const collectSignedUrls = (requestedPaths: string[], results: SignedUrlResult[]) => {
  const failed = results.filter((item) => item.error || !item.signedUrl || !item.path);

  if (failed.length > 0) {
    const details = failed
      .map((item) => {
        const path = item.path ?? 'unknown';
        return item.error ? `${path}: ${item.error}` : path;
      })
      .join('; ');

    throw new Error(`Не удалось создать ссылки на изображения: ${details}`);
  }

  const signedUrls = new Map<string, string>();

  for (const item of results) {
    if (!item.path || !item.signedUrl) {
      continue;
    }

    signedUrls.set(item.path, item.signedUrl);
  }

  const missingPaths = requestedPaths.filter((path) => !signedUrls.has(path));

  if (missingPaths.length > 0) {
    throw new Error(`Не удалось создать ссылки на изображения: ${missingPaths.join('; ')}`);
  }

  return signedUrls;
};

export const removeGachaCardImage = async (path: string) => {
  const { data, error } = await supabase.storage.from(GACHA_CARD_IMAGES_BUCKET).remove([path]);

  if (error || !data || data.length === 0) {
    throw error ?? new Error('Не удалось удалить файл изображения');
  }
};

export const deleteStoredGachaCardImageIfOwned = async (
  imageStoragePath: string,
  courseId: string,
) => {
  const path = resolveOwnedGachaCardImagePath(imageStoragePath, courseId);

  if (!path) {
    throw new Error('Не удалось удалить файл изображения: путь не принадлежит курсу');
  }

  await removeGachaCardImage(path);
};
