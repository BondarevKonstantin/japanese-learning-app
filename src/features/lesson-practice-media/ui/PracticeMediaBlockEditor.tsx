import { useEffect, useRef, useState } from 'react';

import { uploadPracticeItemImage } from '@/entities/lesson-practice/api/uploadPracticeItemImage';
import {
  createDefaultTheoryMediaBlock,
  isSafeImageUrl,
  THEORY_IMAGE_WIDTHS,
  THEORY_MEDIA_ALIGNS,
  THEORY_MEDIA_GAPS,
  THEORY_MEDIA_MAX_ITEMS,
  type TheoryMediaAlign,
  type TheoryMediaBlock,
  type TheoryMediaGap,
  type TheoryMediaImage,
} from '@/shared/lib/theoryMediaBlock';
import { ImageLightbox, type LightboxImage } from '@/shared/ui/ImageLightbox';
import { TheoryMediaBlockView } from '@/shared/ui/TheoryMediaBlockView';

type PracticeMediaBlockEditorProps = {
  lessonId: string;
  value: TheoryMediaBlock | null;
  onChange: (value: TheoryMediaBlock | null) => void;
  onUploadingChange: (uploading: boolean) => void;
  disabled?: boolean;
};

const fieldClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClassName =
  'rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60';

const ALIGN_LABEL: Record<TheoryMediaAlign, string> = {
  left: 'Слева',
  center: 'По центру',
  right: 'Справа',
};

const GAP_LABEL: Record<TheoryMediaGap, string> = {
  sm: 'Маленький',
  md: 'Средний',
  lg: 'Большой',
};

const readErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
};

export const PracticeMediaBlockEditor = ({
  lessonId,
  value,
  onChange,
  onUploadingChange,
  disabled = false,
}: PracticeMediaBlockEditorProps) => {
  const valueRef = useRef(value);
  const onUploadingChangeRef = useRef(onUploadingChange);
  const uploadRequestRef = useRef(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<LightboxImage | null>(null);

  useEffect(() => {
    valueRef.current = value;
    onUploadingChangeRef.current = onUploadingChange;
  });

  useEffect(() => {
    return () => {
      uploadRequestRef.current += 1;
      onUploadingChangeRef.current(false);
    };
  }, []);

  const updateBlock = (next: TheoryMediaBlock | null) => {
    setUploadError('');
    onChange(next);
  };

  const updateItem = (index: number, patch: Partial<TheoryMediaImage>) => {
    const current = valueRef.current;
    if (!current) {
      return;
    }

    updateBlock({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  };

  const handleUpload = async (index: number, file: File | null) => {
    if (!file || disabled) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Можно загружать только изображения');
      return;
    }

    const requestId = uploadRequestRef.current + 1;
    uploadRequestRef.current = requestId;

    try {
      setUploadError('');
      setUploadingIndex(index);
      onUploadingChange(true);
      const imageUrl = await uploadPracticeItemImage({ file, lessonId });
      if (uploadRequestRef.current !== requestId) {
        return;
      }

      const current = valueRef.current;
      if (!current?.items[index]) {
        return;
      }

      updateItem(index, { src: imageUrl });
    } catch (error) {
      if (uploadRequestRef.current !== requestId) {
        return;
      }

      setUploadError(readErrorMessage(error, 'Не удалось загрузить изображение'));
    } finally {
      if (uploadRequestRef.current === requestId) {
        setUploadingIndex(null);
        onUploadingChange(false);
      }
    }
  };

  const controlsDisabled = disabled || uploadingIndex !== null;

  if (!value) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-primary">Изображения к вопросу</span>
        <p className="text-sm text-text-secondary">
          Необязательно. Можно добавить до четырёх изображений.
        </p>
        <button
          type="button"
          className={`${secondaryButtonClassName} self-start`}
          disabled={disabled}
          onClick={() => updateBlock(createDefaultTheoryMediaBlock())}
        >
          Добавить изображение
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-primary">Изображения к вопросу</span>
        <button
          type="button"
          className="rounded-2xl border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={controlsDisabled}
          onClick={() => updateBlock(null)}
        >
          Удалить все
        </button>
      </div>

      <div className="grid gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-primary">Выравнивание</span>
          <select
            value={value.align}
            disabled={controlsDisabled}
            className={fieldClassName}
            onChange={(event) => {
              const align = THEORY_MEDIA_ALIGNS.find(
                (candidate) => candidate === event.target.value,
              );
              if (!align) {
                return;
              }
              updateBlock({ ...value, align });
            }}
          >
            {THEORY_MEDIA_ALIGNS.map((align) => (
              <option key={align} value={align}>
                {ALIGN_LABEL[align]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-primary">Расстояние</span>
          <select
            value={value.gap}
            disabled={controlsDisabled}
            className={fieldClassName}
            onChange={(event) => {
              const gap = THEORY_MEDIA_GAPS.find((candidate) => candidate === event.target.value);
              if (!gap) {
                return;
              }
              updateBlock({ ...value, gap });
            }}
          >
            {THEORY_MEDIA_GAPS.map((gap) => (
              <option key={gap} value={gap}>
                {GAP_LABEL[gap]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {value.items.map((item, index) => {
          const srcIsInvalid = item.src.trim().length > 0 && !isSafeImageUrl(item.src.trim());

          return (
            <fieldset key={index} className="rounded-2xl border border-border bg-background p-4">
              <legend className="px-2 text-sm font-medium text-text-primary">
                Изображение {index + 1}
              </legend>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">URL изображения</span>
                  <input
                    type="url"
                    value={item.src}
                    disabled={controlsDisabled}
                    autoComplete="off"
                    placeholder="https://"
                    className={fieldClassName}
                    onChange={(event) => updateItem(index, { src: event.target.value })}
                  />
                  {srcIsInvalid ? (
                    <span className="text-sm text-accent">Укажите корректный http(s) URL</span>
                  ) : null}
                </label>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={controlsDisabled}
                    id={`practice-media-upload-${lessonId}-${index}`}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.currentTarget.value = '';
                      void handleUpload(index, file);
                    }}
                  />
                  <label
                    htmlFor={`practice-media-upload-${lessonId}-${index}`}
                    className={`${secondaryButtonClassName} inline-flex cursor-pointer ${
                      controlsDisabled ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {uploadingIndex === index ? 'Загрузка...' : 'Загрузить файл'}
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Размер</span>
                  <select
                    value={String(item.width)}
                    disabled={controlsDisabled}
                    className={fieldClassName}
                    onChange={(event) => {
                      const width = THEORY_IMAGE_WIDTHS.find(
                        (candidate) => String(candidate) === event.target.value,
                      );
                      if (!width) {
                        return;
                      }
                      updateItem(index, { width });
                    }}
                  >
                    {THEORY_IMAGE_WIDTHS.map((width) => (
                      <option key={width} value={width}>
                        {width}%
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Подпись</span>
                  <input
                    type="text"
                    value={item.caption ?? ''}
                    disabled={controlsDisabled}
                    className={fieldClassName}
                    placeholder="Необязательно"
                    onChange={(event) => updateItem(index, { caption: event.target.value })}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    disabled={controlsDisabled || index === 0}
                    onClick={() => updateBlock(moveItem(value, index, -1))}
                  >
                    Влево
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    disabled={controlsDisabled || index === value.items.length - 1}
                    onClick={() => updateBlock(moveItem(value, index, 1))}
                  >
                    Вправо
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    disabled={controlsDisabled}
                    onClick={() => updateBlock(removeItem(value, index))}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      {value.items.length < THEORY_MEDIA_MAX_ITEMS ? (
        <button
          type="button"
          className={`${secondaryButtonClassName} self-start`}
          disabled={controlsDisabled}
          onClick={() => updateBlock(addItem(value))}
        >
          Добавить изображение
        </button>
      ) : (
        <p className="text-sm text-text-secondary">В задании уже четыре изображения.</p>
      )}

      <div>
        <p className="text-sm font-medium text-text-primary">Предпросмотр</p>
        <TheoryMediaBlockView block={value} onOpenImage={(src, alt) => setPreview({ src, alt })} />
      </div>

      {uploadError ? (
        <p className="rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
          {uploadError}
        </p>
      ) : null}

      <ImageLightbox image={preview} onClose={() => setPreview(null)} />
    </div>
  );
};

const moveItem = (block: TheoryMediaBlock, index: number, direction: -1 | 1): TheoryMediaBlock => {
  const target = index + direction;
  if (target < 0 || target >= block.items.length) {
    return block;
  }

  const items = block.items.slice();
  const currentItem = items[index];
  const targetItem = items[target];
  if (!currentItem || !targetItem) {
    return block;
  }

  items[index] = targetItem;
  items[target] = currentItem;
  return { ...block, items };
};

const removeItem = (block: TheoryMediaBlock, index: number): TheoryMediaBlock | null => {
  if (block.items.length <= 1) {
    return null;
  }

  return {
    ...block,
    items: block.items.filter((_, itemIndex) => itemIndex !== index),
  };
};

const addItem = (block: TheoryMediaBlock): TheoryMediaBlock => {
  if (block.items.length >= THEORY_MEDIA_MAX_ITEMS) {
    return block;
  }

  return {
    ...block,
    items: [...block.items, { src: '', width: 50 }],
  };
};
