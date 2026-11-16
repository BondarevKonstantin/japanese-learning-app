import type {
  GachaCardRarity,
  GachaImageFit,
  GachaImageTransform,
} from '@/entities/gacha-card/model/types';

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
  fit: 'cover',
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

/**
 * Scale stays relative to the object-cover base in both modes.
 * Contain's minimum is the largest scale that still fits the source
 * inside the rarity window. Cover keeps the original 1..3 range.
 */
export const getGachaImageScaleBounds = (
  imageSize: ImageSize,
  rarity: GachaCardRarity,
  fit: GachaImageFit,
): { min: number; max: number } => {
  if (fit !== 'contain' || !(imageSize.width > 0) || !(imageSize.height > 0)) {
    return { min: GACHA_IMAGE_SCALE_MIN, max: GACHA_IMAGE_SCALE_MAX };
  }

  const base = getBaseCoverSize(imageSize);
  const maskWindow = getGachaMaskWindow(rarity);
  const containScale = Math.min(
    (maskWindow.right - maskWindow.left) / base.width,
    (maskWindow.bottom - maskWindow.top) / base.height,
  );

  if (!Number.isFinite(containScale) || containScale <= 0) {
    return { min: GACHA_IMAGE_SCALE_MIN, max: GACHA_IMAGE_SCALE_MAX };
  }

  return {
    min: Math.min(containScale, GACHA_IMAGE_SCALE_MIN),
    max: GACHA_IMAGE_SCALE_MAX,
  };
};

const normalizeScale = (
  scale: number,
  imageSize: ImageSize,
  rarity: GachaCardRarity,
  fit: GachaImageFit,
) => {
  const bounds = getGachaImageScaleBounds(imageSize, rarity, fit);

  if (!Number.isFinite(scale)) {
    return bounds.min;
  }

  return clampNumber(scale, bounds.min, bounds.max);
};

const clampOffsetToWindow = (
  offset: number,
  displayedExtent: number,
  windowStart: number,
  windowEnd: number,
  fit: GachaImageFit,
) => {
  const half = displayedExtent / 2;
  const coverMin = windowEnd - half - 0.5;
  const coverMax = windowStart + half - 0.5;
  const safeOffset = Number.isFinite(offset) ? offset : 0;
  // A contain image smaller than the window slides inside it. At and above
  // the window size, the cover limits keep the window filled.
  const containInside = fit === 'contain' && coverMin > coverMax;
  const min = containInside ? coverMax : coverMin;
  const max = containInside ? coverMin : coverMax;
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

  const fit: GachaImageFit = transform.fit === 'contain' ? 'contain' : 'cover';
  const scale = normalizeScale(transform.scale, imageSize, rarity, fit);
  const displayed = getDisplayedImageSize(imageSize, scale);
  const maskWindow = getGachaMaskWindow(rarity);

  return {
    scale,
    offsetX: clampOffsetToWindow(
      transform.offsetX,
      displayed.width,
      maskWindow.left,
      maskWindow.right,
      fit,
    ),
    offsetY: clampOffsetToWindow(
      transform.offsetY,
      displayed.height,
      maskWindow.top,
      maskWindow.bottom,
      fit,
    ),
    fit,
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
      fit: origin.fit,
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

export const serializeGachaImageTransform = (transform: GachaImageTransform) => {
  const placement = {
    scale: transform.scale,
    offsetX: transform.offsetX,
    offsetY: transform.offsetY,
  };

  // Cover omits fit so the stored object stays the original three keys.
  if (transform.fit === 'contain') {
    return { ...placement, fit: 'contain' as const };
  }

  return placement;
};

const parseFit = (value: unknown): GachaImageFit | null => {
  if (value === undefined) {
    return 'cover';
  }

  if (value === 'cover' || value === 'contain') {
    return value;
  }

  return null;
};

const parseTransformRecord = (value: object): GachaImageTransform | null => {
  const record = value as Record<string, unknown>;
  const { scale, offsetX, offsetY } = record;
  const fit = parseFit(record.fit);

  if (!fit) {
    return null;
  }

  if (typeof scale !== 'number' || typeof offsetX !== 'number' || typeof offsetY !== 'number') {
    return null;
  }

  if (!Number.isFinite(scale) || !Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
    return null;
  }

  if (fit === 'cover') {
    if (scale < GACHA_IMAGE_SCALE_MIN || scale > GACHA_IMAGE_SCALE_MAX) {
      return null;
    }
  } else if (!(scale > 0) || scale > GACHA_IMAGE_SCALE_MAX) {
    return null;
  }

  if (
    Math.abs(offsetX) > GACHA_IMAGE_OFFSET_LIMIT ||
    Math.abs(offsetY) > GACHA_IMAGE_OFFSET_LIMIT
  ) {
    return null;
  }

  return { scale, offsetX, offsetY, fit };
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
