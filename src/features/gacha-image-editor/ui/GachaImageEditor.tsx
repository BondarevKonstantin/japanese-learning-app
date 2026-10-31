import {
  useRef,
  type PointerEvent as ReactPointerEvent,
  type DragEvent as ReactDragEvent,
} from 'react';
import { GachaCard } from '@/entities/gacha-card/ui/GachaCard';
import {
  GACHA_IMAGE_SCALE_MAX,
  GACHA_IMAGE_SCALE_MIN,
  createDefaultGachaImageTransform,
  moveGachaImageByPointer,
  normalizeGachaImageTransform,
} from '@/entities/gacha-card/model/imageTransform';
import type { ImageSize } from '@/entities/gacha-card/model/imageTransform';
import type { GachaCardRarity, GachaImageTransform } from '@/entities/gacha-card/model/types';

type GachaImageEditorProps = {
  imageUrl: string;
  imageSize: ImageSize;
  rarity: GachaCardRarity;
  transform: GachaImageTransform;
  alt: string;
  onTransformChange: (transform: GachaImageTransform) => void;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  canvasWidth: number;
  canvasHeight: number;
  origin: GachaImageTransform;
};

export const GachaImageEditor = ({
  imageUrl,
  imageSize,
  rarity,
  transform,
  alt,
  onTransformChange,
}: GachaImageEditorProps) => {
  const dragRef = useRef<DragState | null>(null);
  const scaleLabel = transform.scale.toFixed(2);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragRef.current) {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is unavailable until the browser has a real pointer.
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      origin: transform,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    onTransformChange(
      moveGachaImageByPointer(
        drag.origin,
        event.clientX - drag.startClientX,
        event.clientY - drag.startClientY,
        drag.canvasWidth,
        drag.canvasHeight,
        imageSize,
        rarity,
      ),
    );
  };

  const releaseCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    releaseCapture(event);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    releaseCapture(event);
    onTransformChange(drag.origin);
  };

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    onTransformChange(drag.origin);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Положение изображения в рамке"
        className="mx-auto w-full max-w-[220px] cursor-grab touch-none select-none overscroll-none active:cursor-grabbing sm:max-w-[240px]"
        style={{ touchAction: 'none', userSelect: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onDragStart={(event: ReactDragEvent<HTMLDivElement>) => event.preventDefault()}
      >
        <GachaCard rarity={rarity} imageUrl={imageUrl} alt={alt} imageTransform={transform} />
      </div>

      <p className="text-center text-xs text-text-secondary">Перетащите изображение внутри рамки</p>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between gap-3 text-sm font-medium text-text-primary">
          <span>Масштаб</span>
          <span className="tabular-nums text-text-secondary">{scaleLabel}</span>
        </span>
        <input
          type="range"
          min={GACHA_IMAGE_SCALE_MIN}
          max={GACHA_IMAGE_SCALE_MAX}
          step={0.01}
          value={transform.scale}
          aria-valuemin={GACHA_IMAGE_SCALE_MIN}
          aria-valuemax={GACHA_IMAGE_SCALE_MAX}
          aria-valuenow={transform.scale}
          aria-valuetext={scaleLabel}
          onChange={(event) => {
            onTransformChange(
              normalizeGachaImageTransform(
                { ...transform, scale: Number(event.target.value) },
                imageSize,
                rarity,
              ),
            );
          }}
          className="w-full accent-primary"
        />
      </label>

      <button
        type="button"
        onClick={() => onTransformChange(createDefaultGachaImageTransform())}
        className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background"
      >
        Сбросить
      </button>
    </div>
  );
};
