import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { uploadLessonTheoryImage } from '@/entities/lesson/api/uploadLessonImage';
import { lockBackgroundScroll } from '@/shared/lib/lockBackgroundScroll';
import {
  applyTheoryMediaBlock,
  createDefaultTheoryMediaBlock,
  findTheoryMediaBlockAtCursor,
  getTheoryMediaBlockError,
  isSafeImageUrl,
  normalizeTheoryMediaBlock,
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

type TheoryMediaBlockControlsProps = {
  markdown: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onMarkdownChange: (value: string) => void;
  disabled?: boolean;
};

type EditorSession = {
  replaceRange: { start: number; end: number } | null;
  invalid: boolean;
};

const fieldClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light';

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

const cloneBlock = (block: TheoryMediaBlock): TheoryMediaBlock => {
  return {
    align: block.align,
    gap: block.gap,
    items: block.items.map((item) => ({ ...item })),
  };
};

export const TheoryMediaBlockControls = ({
  markdown,
  textareaRef,
  onMarkdownChange,
  disabled = false,
}: TheoryMediaBlockControlsProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sessionRef = useRef<EditorSession | null>(null);
  const uploadRequestRef = useRef(0);
  const closeActionRef = useRef<'cancel' | 'apply'>('cancel');
  const pendingCursorRef = useRef<number | null>(null);
  const savedSelectionRef = useRef({ start: 0, end: 0 });

  const [cursor, setCursor] = useState(0);
  const [session, setSession] = useState<EditorSession | null>(null);
  const [draft, setDraft] = useState<TheoryMediaBlock>(createDefaultTheoryMediaBlock);
  const [formError, setFormError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<LightboxImage | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const syncCursor = () => {
      setCursor(textarea.selectionStart ?? 0);
    };

    textarea.addEventListener('keyup', syncCursor);
    textarea.addEventListener('click', syncCursor);
    textarea.addEventListener('input', syncCursor);
    textarea.addEventListener('select', syncCursor);
    textarea.addEventListener('focus', syncCursor);

    return () => {
      textarea.removeEventListener('keyup', syncCursor);
      textarea.removeEventListener('click', syncCursor);
      textarea.removeEventListener('input', syncCursor);
      textarea.removeEventListener('select', syncCursor);
      textarea.removeEventListener('focus', syncCursor);
    };
  }, [textareaRef]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    const selector = session.invalid ? '[data-close-focus="true"]' : '[data-autofocus="true"]';
    dialog.querySelector<HTMLElement>(selector)?.focus();
    return lockBackgroundScroll(dialog);
  }, [session]);

  const insideBlock = findTheoryMediaBlockAtCursor(markdown, cursor) !== null;

  const restoreTextarea = (nextCursor: number | null) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const position =
        nextCursor ?? Math.min(savedSelectionRef.current.start, textarea.value.length);
      textarea.focus();
      textarea.setSelectionRange(position, position);
      setCursor(position);
    });
  };

  const completeClose = () => {
    uploadRequestRef.current += 1;
    sessionRef.current = null;
    const nextCursor = closeActionRef.current === 'apply' ? pendingCursorRef.current : null;
    closeActionRef.current = 'cancel';
    pendingCursorRef.current = null;
    setSession(null);
    setPreview(null);
    setUploadingIndex(null);
    restoreTextarea(nextCursor);
  };

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }

    completeClose();
  };

  const openEditor = () => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? markdown.length;
    const selectionEnd = textarea?.selectionEnd ?? markdown.length;
    const span = findTheoryMediaBlockAtCursor(markdown, selectionStart);

    savedSelectionRef.current = { start: selectionStart, end: selectionEnd };
    closeActionRef.current = 'cancel';
    pendingCursorRef.current = null;
    setFormError('');
    setUploadError('');
    setUploadingIndex(null);
    setPreview(null);
    setDraft(span?.block ? cloneBlock(span.block) : createDefaultTheoryMediaBlock());
    const nextSession = {
      replaceRange: span ? { start: span.start, end: span.end } : null,
      invalid: span !== null && span.block === null,
    };
    sessionRef.current = nextSession;
    setSession(nextSession);
  };

  const updateItem = (index: number, patch: Partial<TheoryMediaImage>) => {
    setFormError('');
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const handleUpload = async (index: number, file: File | null) => {
    if (!file) {
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
      const imageUrl = await uploadLessonTheoryImage({ file });
      if (uploadRequestRef.current !== requestId || !sessionRef.current) {
        return;
      }
      updateItem(index, { src: imageUrl });
    } catch (error) {
      if (uploadRequestRef.current !== requestId || !sessionRef.current) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Не удалось загрузить изображение';
      setUploadError(message);
    } finally {
      if (uploadRequestRef.current === requestId) {
        setUploadingIndex(null);
      }
    }
  };

  const handleApply = () => {
    if (!session || session.invalid || uploadingIndex !== null) {
      return;
    }

    const error = getTheoryMediaBlockError(draft);
    if (error) {
      setFormError(error);
      return;
    }

    const result = applyTheoryMediaBlock({
      markdown,
      block: normalizeTheoryMediaBlock(draft),
      selectionStart: savedSelectionRef.current.start,
      selectionEnd: savedSelectionRef.current.end,
      replaceRange: session.replaceRange,
    });

    onMarkdownChange(result.nextValue);
    closeActionRef.current = 'apply';
    pendingCursorRef.current = result.nextCursorPosition;
    requestClose();
  };

  const dialog = session
    ? createPortal(
        <dialog
          ref={dialogRef}
          aria-labelledby="theory-media-block-title"
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto rounded-3xl border border-border bg-surface p-6 text-text-primary shadow-sm backdrop:bg-black/60"
          onClose={completeClose}
        >
          <h2 id="theory-media-block-title" className="text-xl font-semibold">
            {session.replaceRange ? 'Настроить блок изображений' : 'Добавить блок изображений'}
          </h2>

          {session.invalid ? (
            <div className="mt-4 flex flex-col gap-4">
              <p className="rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
                Не удалось разобрать этот блок изображений. Текст урока не изменён.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  data-close-focus="true"
                  className={secondaryButtonClassName}
                  onClick={requestClose}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Выравнивание</span>
                  <select
                    data-autofocus="true"
                    value={draft.align}
                    className={fieldClassName}
                    onChange={(event) => {
                      const align = THEORY_MEDIA_ALIGNS.find(
                        (candidate) => candidate === event.target.value,
                      );
                      if (!align) {
                        return;
                      }
                      setFormError('');
                      setDraft((current) => ({ ...current, align }));
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
                  <span className="text-sm font-medium">Расстояние</span>
                  <select
                    value={draft.gap}
                    className={fieldClassName}
                    onChange={(event) => {
                      const gap = THEORY_MEDIA_GAPS.find(
                        (candidate) => candidate === event.target.value,
                      );
                      if (!gap) {
                        return;
                      }
                      setFormError('');
                      setDraft((current) => ({ ...current, gap }));
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
                {draft.items.map((item, index) => {
                  const srcIsInvalid =
                    item.src.trim().length > 0 && !isSafeImageUrl(item.src.trim());

                  return (
                    <fieldset
                      key={index}
                      className="rounded-2xl border border-border bg-background p-4"
                    >
                      <legend className="px-2 text-sm font-medium">Изображение {index + 1}</legend>
                      <div className="mt-3 flex flex-col gap-3">
                        {isSafeImageUrl(item.src.trim()) ? (
                          <img
                            src={item.src.trim()}
                            alt=""
                            className="h-24 w-full rounded-2xl border border-border object-contain"
                          />
                        ) : null}

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium">URL изображения</span>
                          <input
                            type="url"
                            value={item.src}
                            autoComplete="off"
                            placeholder="https://"
                            className={fieldClassName}
                            onChange={(event) => updateItem(index, { src: event.target.value })}
                          />
                          {srcIsInvalid ? (
                            <span className="text-sm text-accent">
                              Укажите корректный http(s) URL
                            </span>
                          ) : null}
                        </label>

                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingIndex !== null}
                            id={`theory-media-upload-${index}`}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              event.currentTarget.value = '';
                              void handleUpload(index, file);
                            }}
                          />
                          <label
                            htmlFor={`theory-media-upload-${index}`}
                            className={`${secondaryButtonClassName} inline-flex cursor-pointer ${
                              uploadingIndex !== null ? 'pointer-events-none opacity-60' : ''
                            }`}
                          >
                            {uploadingIndex === index ? 'Загрузка...' : 'Загрузить файл'}
                          </label>
                        </div>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium">Размер</span>
                          <select
                            value={String(item.width)}
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
                          <span className="text-sm font-medium">Подпись</span>
                          <input
                            type="text"
                            value={item.caption ?? ''}
                            className={fieldClassName}
                            placeholder="Необязательно"
                            onChange={(event) => updateItem(index, { caption: event.target.value })}
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={secondaryButtonClassName}
                            disabled={index === 0 || uploadingIndex !== null}
                            onClick={() => {
                              setFormError('');
                              setDraft((current) => moveItem(current, index, -1));
                            }}
                          >
                            Влево
                          </button>
                          <button
                            type="button"
                            className={secondaryButtonClassName}
                            disabled={index === draft.items.length - 1 || uploadingIndex !== null}
                            onClick={() => {
                              setFormError('');
                              setDraft((current) => moveItem(current, index, 1));
                            }}
                          >
                            Вправо
                          </button>
                          <button
                            type="button"
                            className={secondaryButtonClassName}
                            disabled={draft.items.length === 1 || uploadingIndex !== null}
                            onClick={() => {
                              setFormError('');
                              setDraft((current) => removeItem(current, index));
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </fieldset>
                  );
                })}
              </div>

              {draft.items.length < THEORY_MEDIA_MAX_ITEMS ? (
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  disabled={uploadingIndex !== null}
                  onClick={() => {
                    setFormError('');
                    setDraft((current) => addItem(current));
                  }}
                >
                  Добавить изображение
                </button>
              ) : (
                <p className="text-sm text-text-secondary">В блоке уже четыре изображения.</p>
              )}

              <div>
                <p className="text-sm font-medium">Предпросмотр</p>
                <TheoryMediaBlockView
                  block={draft}
                  onOpenImage={(src, alt) => setPreview({ src, alt })}
                />
              </div>

              {formError ? (
                <p className="rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
                  {formError}
                </p>
              ) : null}
              {uploadError ? (
                <p className="rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
                  {uploadError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button type="button" className={secondaryButtonClassName} onClick={requestClose}>
                  Отмена
                </button>
                <button
                  type="button"
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={uploadingIndex !== null}
                  onClick={handleApply}
                >
                  {session.replaceRange ? 'Сохранить' : 'Вставить'}
                </button>
              </div>
            </div>
          )}
        </dialog>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        className={secondaryButtonClassName}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={session !== null}
        onClick={openEditor}
      >
        {insideBlock ? 'Настроить блок изображений' : 'Добавить блок изображений'}
      </button>
      {dialog}
      <ImageLightbox image={preview} onClose={() => setPreview(null)} />
    </>
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

const removeItem = (block: TheoryMediaBlock, index: number): TheoryMediaBlock => {
  if (block.items.length <= 1) {
    return block;
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
