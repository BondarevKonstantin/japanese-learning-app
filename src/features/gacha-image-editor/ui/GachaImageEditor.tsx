import {
  useRef,
  type PointerEvent as ReactPointerEvent,
  type DragEvent as ReactDragEvent,
} from 'react';
import { GachaCard } from '@/entities/gacha-card/ui/GachaCard';
import {
  getGachaImageScaleBounds,
  moveGachaImageByPointer,
  normalizeGachaImageTransform,
} from '@/entities/gacha-card/model/imageTransform';
import type { ImageSize } from '@/entities/gacha-card/model/imageTransform';
import type {
  GachaCardRarity,
  GachaImageFit,
  GachaImageTransform,
} from '@/entities/gacha-card/model/types';

type GachaImageEditorProps = {
  imageUrl: string;
  imageSize: ImageSize;
  rarity: GachaCardRarity;
  transform: GachaImageTransform;
  alt: string;
  onTransformChange: (transform: GachaImageTransform) => void;
};

const fitOptions: { fit: GachaImageFit; label: string }[] = [
  { fit: 'cover', label: 'Заполнить рамку' },
  { fit: 'contain', label: 'Показать целиком' },
];

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
  const scaleBounds = getGachaImageScaleBounds(imageSize, rarity, transform.fit);
  const scaleLabel = transform.scale.toFixed(2);

  const handleFitChange = (fit: GachaImageFit) => {
    if (fit === transform.fit) {
      return;
    }

    const scale =
      fit === 'contain'
        ? getGachaImageScaleBounds(imageSize, rarity, 'contain').min
        : Math.max(1, transform.scale);

    onTransformChange(
      normalizeGachaImageTransform({ ...transform, fit, scale }, imageSize, rarity),
    );
  };

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

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-primary">Кадрирование</span>
        <div role="group" aria-label="Режим кадрирования" className="grid grid-cols-2 gap-2">
          {fitOptions.map((option) => {
            const selected = transform.fit === option.fit;

            return (
              <button
                key={option.fit}
                type="button"
                aria-pressed={selected}
                onClick={() => handleFitChange(option.fit)}
                className={`min-w-0 rounded-2xl border px-2 py-2 text-center text-sm font-medium leading-snug transition ${
                  selected
                    ? 'border-primary bg-primary-light text-text-primary'
                    : 'border-border text-text-primary hover:bg-background'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between gap-3 text-sm font-medium text-text-primary">
          <span>Масштаб</span>
          <span className="tabular-nums text-text-secondary">{scaleLabel}</span>
        </span>
        <input
          type="range"
          min={scaleBounds.min}
          max={scaleBounds.max}
          step={0.01}
          value={transform.scale}
          aria-valuemin={scaleBounds.min}
          aria-valuemax={scaleBounds.max}
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
        onClick={() =>
          onTransformChange(
            normalizeGachaImageTransform(
              {
                scale: scaleBounds.min,
                offsetX: 0,
                offsetY: 0,
                fit: transform.fit,
              },
              imageSize,
              rarity,
            ),
          )
        }
        className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background"
      >
        Сбросить
      </button>
    </div>
  );
};
