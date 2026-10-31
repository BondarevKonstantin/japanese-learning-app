import { useState, type CSSProperties } from 'react';
import { getGachaImagePlacement } from '@/entities/gacha-card/model/imageTransform';
import type { GachaCardRarity, GachaImageTransform } from '@/entities/gacha-card/model/types';
import { cn } from '@/shared/lib/cn';

type GachaCardProps = {
  rarity: GachaCardRarity;
  imageUrl: string;
  alt: string;
  imageTransform?: GachaImageTransform | null;
  isLocked?: boolean;
  className?: string;
};

const gachaCardAssets: Record<GachaCardRarity, { frame: string; mask: string }> = {
  common: {
    frame: '/assets/gacha/frames/common.png',
    mask: '/assets/gacha/masks/common.png',
  },
  rare: {
    frame: '/assets/gacha/frames/rare.png',
    mask: '/assets/gacha/masks/rare.png',
  },
  epic: {
    frame: '/assets/gacha/frames/epic.png',
    mask: '/assets/gacha/masks/epic.png',
  },
  legendary: {
    frame: '/assets/gacha/frames/legendary.png',
    mask: '/assets/gacha/masks/legendary.png',
  },
};

const getMaskStyle = (maskUrl: string): CSSProperties => ({
  maskImage: `url("${maskUrl}")`,
  WebkitMaskImage: `url("${maskUrl}")`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
  maskMode: 'alpha',
});

const toPercent = (value: number) => `${value * 100}%`;

export const GachaCard = ({
  rarity,
  imageUrl,
  alt,
  imageTransform = null,
  isLocked = false,
  className,
}: GachaCardProps) => {
  const assets = gachaCardAssets[rarity];
  const illustrationUrl = isLocked ? '' : imageUrl.trim();
  const [failedIllustrationUrl, setFailedIllustrationUrl] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const showIllustration = illustrationUrl.length > 0 && failedIllustrationUrl !== illustrationUrl;
  const intrinsicSize =
    loadedImage?.url === illustrationUrl
      ? { width: loadedImage.width, height: loadedImage.height }
      : null;
  const placement =
    showIllustration && imageTransform && intrinsicSize
      ? getGachaImagePlacement(imageTransform, intrinsicSize, rarity)
      : null;

  return (
    <div className={cn('relative aspect-[2/3] w-full min-w-0', className)}>
      <div
        className="absolute inset-0 overflow-hidden bg-[#e8e4dc]"
        style={getMaskStyle(assets.mask)}
      >
        {showIllustration ? (
          <img
            src={illustrationUrl}
            alt={alt}
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              setLoadedImage({
                url: illustrationUrl,
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            }}
            onError={() => setFailedIllustrationUrl(illustrationUrl)}
            className={cn(
              'select-none',
              placement ? 'absolute max-h-none max-w-none' : 'h-full w-full object-cover',
              imageTransform && !placement && 'invisible',
            )}
            style={
              placement
                ? {
                    width: toPercent(placement.width),
                    height: toPercent(placement.height),
                    left: toPercent(placement.left),
                    top: toPercent(placement.top),
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }
                : undefined
            }
          />
        ) : null}
      </div>

      <img
        src={assets.frame}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain select-none"
      />
    </div>
  );
};
