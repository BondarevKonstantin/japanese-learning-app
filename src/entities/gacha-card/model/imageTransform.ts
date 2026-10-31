import type { GachaCardRarity, GachaImageTransform } from '@/entities/gacha-card/model/types';

export const GACHA_CANVAS_ASPECT = 2 / 3;
export const GACHA_IMAGE_SCALE_MIN = 1;
export const GACHA_IMAGE_SCALE_MAX = 3;
export const GACHA_IMAGE_OFFSET_LIMIT = 5;

const MASK_SOURCE_WIDTH = 1024;
const MASK_SOURCE_HEIGHT = 1536;

/**
 * Inclusive bounds of pixels with alpha >= 1 in the mask PNGs.
 * Those files are 1024×1536, the same 2:3 aspect as the card, and the card
 * applies them with mask-size: contain, so the bounds map onto the full canvas.
 */
const MASK_OPAQUE_PIXEL_BOUNDS: Record<
  GachaCardRarity,
  { minX: number; minY: number; maxX: number; maxY: number }
> = {
  common: { minX: 178, minY: 203, maxX: 850, maxY: 1198 },
  rare: { minX: 159, minY: 228, maxX: 836, maxY: 1163 },
  epic: { minX: 177, minY: 291, maxX: 844, maxY: 1201 },
  legendary: { minX: 179, minY: 282, maxX: 844, maxY: 1145 },
};

export type ImageSize = {
  width: number;
  height: number;
};

export type GachaMaskWindow = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type GachaImagePlacement = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export const createDefaultGachaImageTransform = (): GachaImageTransform => ({
  scale: GACHA_IMAGE_SCALE_MIN,
  offsetX: 0,
  offsetY: 0,
});

export const getGachaMaskWindow = (rarity: GachaCardRarity): GachaMaskWindow => {
  const bounds = MASK_OPAQUE_PIXEL_BOUNDS[rarity];

  return {
    left: bounds.minX / MASK_SOURCE_WIDTH,
    top: bounds.minY / MASK_SOURCE_HEIGHT,
    right: (bounds.maxX + 1) / MASK_SOURCE_WIDTH,
    bottom: (bounds.maxY + 1) / MASK_SOURCE_HEIGHT,
  };
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const getBaseCoverSize = (imageSize: ImageSize): { width: number; height: number } => {
  const imageAspect = imageSize.width / imageSize.height;

  return {
    width: Math.max(1, imageAspect / GACHA_CANVAS_ASPECT),
    height: Math.max(1, GACHA_CANVAS_ASPECT / imageAspect),
  };
};

const getDisplayedImageSize = (imageSize: ImageSize, scale: number) => {
  const base = getBaseCoverSize(imageSize);

  return {
    width: base.width * scale,
    height: base.height * scale,
  };
};

const normalizeScale = (scale: number) => {
  if (!Number.isFinite(scale)) {
    return GACHA_IMAGE_SCALE_MIN;
  }

  return clampNumber(scale, GACHA_IMAGE_SCALE_MIN, GACHA_IMAGE_SCALE_MAX);
};

const clampOffsetToWindow = (
  offset: number,
  displayedExtent: number,
  windowStart: number,
  windowEnd: number,
) => {
  const half = displayedExtent / 2;
  const min = windowEnd - half - 0.5;
  const max = windowStart + half - 0.5;
  const safeOffset = Number.isFinite(offset) ? offset : 0;
  const lower = Math.max(min, -GACHA_IMAGE_OFFSET_LIMIT);
  const upper = Math.min(max, GACHA_IMAGE_OFFSET_LIMIT);

  if (lower > upper) {
    return clampNumber(0, Math.min(min, max), Math.max(min, max));
  }

  return clampNumber(safeOffset, lower, upper);
};

export const normalizeGachaImageTransform = (
  transform: GachaImageTransform,
  imageSize: ImageSize,
  rarity: GachaCardRarity,
): GachaImageTransform => {
  if (!(imageSize.width > 0) || !(imageSize.height > 0)) {
    return createDefaultGachaImageTransform();
  }

  const scale = normalizeScale(transform.scale);
  const displayed = getDisplayedImageSize(imageSize, scale);
  const maskWindow = getGachaMaskWindow(rarity);

  return {
    scale,
    offsetX: clampOffsetToWindow(
      transform.offsetX,
      displayed.width,
      maskWindow.left,
      maskWindow.right,
    ),
    offsetY: clampOffsetToWindow(
      transform.offsetY,
      displayed.height,
      maskWindow.top,
      maskWindow.bottom,
    ),
  };
};

export const pointerDeltaToOffset = (
  deltaX: number,
  deltaY: number,
  canvasWidth: number,
  canvasHeight: number,
) => ({
  offsetX: canvasWidth > 0 ? deltaX / canvasWidth : 0,
  offsetY: canvasHeight > 0 ? deltaY / canvasHeight : 0,
});

export const moveGachaImageByPointer = (
  origin: GachaImageTransform,
  deltaX: number,
  deltaY: number,
  canvasWidth: number,
  canvasHeight: number,
  imageSize: ImageSize,
  rarity: GachaCardRarity,
): GachaImageTransform => {
  const delta = pointerDeltaToOffset(deltaX, deltaY, canvasWidth, canvasHeight);

  return normalizeGachaImageTransform(
    {
      scale: origin.scale,
      offsetX: origin.offsetX + delta.offsetX,
      offsetY: origin.offsetY + delta.offsetY,
    },
    imageSize,
    rarity,
  );
};

export const getGachaImagePlacement = (
  transform: GachaImageTransform,
  imageSize: ImageSize,
  rarity: GachaCardRarity,
): GachaImagePlacement | null => {
  if (!(imageSize.width > 0) || !(imageSize.height > 0)) {
    return null;
  }

  const normalized = normalizeGachaImageTransform(transform, imageSize, rarity);
  const displayed = getDisplayedImageSize(imageSize, normalized.scale);

  return {
    width: displayed.width,
    height: displayed.height,
    left: 0.5 + normalized.offsetX - displayed.width / 2,
    top: 0.5 + normalized.offsetY - displayed.height / 2,
  };
};

const parseTransformRecord = (value: object): GachaImageTransform | null => {
  const record = value as Record<string, unknown>;
  const { scale, offsetX, offsetY } = record;

  if (typeof scale !== 'number' || typeof offsetX !== 'number' || typeof offsetY !== 'number') {
    return null;
  }

  if (!Number.isFinite(scale) || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
    return null;
  }

  if (scale < GACHA_IMAGE_SCALE_MIN || scale > GACHA_IMAGE_SCALE_MAX) {
    return null;
  }

  if (
    Math.abs(offsetX) > GACHA_IMAGE_OFFSET_LIMIT ||
    Math.abs(offsetY) > GACHA_IMAGE_OFFSET_LIMIT
  ) {
    return null;
  }

  return { scale, offsetX, offsetY };
};

export const parseGachaImageTransform = (value: unknown): GachaImageTransform | null => {
  if (typeof value === 'string') {
    try {
      return parseGachaImageTransform(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }

  if (value == null || typeof value !== 'object') {
    return null;
  }

  return parseTransformRecord(value);
};
