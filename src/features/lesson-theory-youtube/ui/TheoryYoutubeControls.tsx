import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { lockBackgroundScroll } from '@/shared/lib/lockBackgroundScroll';
import { findTheoryMediaBlockAtCursor } from '@/shared/lib/theoryMediaBlock';
import {
  applyTheoryYoutubeBlock,
  findTheoryYoutubeBlockAtCursor,
  getYoutubeUrlError,
  parseYoutubeVideoId,
  removeTheoryYoutubeBlock,
  toEditableYoutubeUrl,
} from '@/shared/lib/theoryYoutubeBlock';
import { TheoryYoutubeBlockView } from '@/shared/ui/TheoryYoutubeBlockView';

type TheoryYoutubeControlsProps = {
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

export const TheoryYoutubeControls = ({
  markdown,
  textareaRef,
  onMarkdownChange,
  disabled = false,
}: TheoryYoutubeControlsProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeActionRef = useRef<'cancel' | 'apply'>('cancel');
  const pendingCursorRef = useRef<number | null>(null);
  const savedSelectionRef = useRef({ start: 0, end: 0 });

  const [cursor, setCursor] = useState(0);
  const [session, setSession] = useState<EditorSession | null>(null);
  const [url, setUrl] = useState('');
  const [formError, setFormError] = useState('');

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

  const insideBlock = findTheoryYoutubeBlockAtCursor(markdown, cursor) !== null;
  const videoId = parseYoutubeVideoId(url);

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
    const nextCursor = closeActionRef.current === 'apply' ? pendingCursorRef.current : null;
    closeActionRef.current = 'cancel';
    pendingCursorRef.current = null;
    setSession(null);
    setUrl('');
    setFormError('');
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
    let selectionStart = textarea?.selectionStart ?? markdown.length;
    let selectionEnd = textarea?.selectionEnd ?? markdown.length;
    const span = findTheoryYoutubeBlockAtCursor(markdown, selectionStart);

    if (!span && selectionStart === selectionEnd) {
      const imageSpan = findTheoryMediaBlockAtCursor(markdown, selectionStart);
      if (imageSpan) {
        selectionStart = imageSpan.end;
        selectionEnd = imageSpan.end;
      }
    }

    savedSelectionRef.current = { start: selectionStart, end: selectionEnd };
    closeActionRef.current = 'cancel';
    pendingCursorRef.current = null;
    setFormError('');
    setUrl(span?.block ? toEditableYoutubeUrl(span.block.videoId) : '');
    const nextSession = {
      replaceRange: span ? { start: span.start, end: span.end } : null,
      invalid: span !== null && span.block === null,
    };
    setSession(nextSession);
  };

  const handleApply = () => {
    if (!session || session.invalid) {
      return;
    }

    const error = getYoutubeUrlError(url);
    const nextVideoId = parseYoutubeVideoId(url);
    if (error || !nextVideoId) {
      setFormError(error ?? 'Некорректная ссылка YouTube');
      return;
    }

    const result = applyTheoryYoutubeBlock({
      markdown,
      block: { videoId: nextVideoId },
      selectionStart: savedSelectionRef.current.start,
      selectionEnd: savedSelectionRef.current.end,
      replaceRange: session.replaceRange,
    });

    onMarkdownChange(result.nextValue);
    closeActionRef.current = 'apply';
    pendingCursorRef.current = result.nextCursorPosition;
    requestClose();
  };

  const handleDelete = () => {
    if (!session?.replaceRange) {
      return;
    }

    const result = removeTheoryYoutubeBlock({
      markdown,
      range: session.replaceRange,
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
          aria-labelledby="theory-youtube-block-title"
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto rounded-3xl border border-border bg-surface p-6 text-text-primary shadow-sm backdrop:bg-black/60"
          onClose={completeClose}
        >
          <h2 id="theory-youtube-block-title" className="text-xl font-semibold">
            {session.replaceRange ? 'Настроить YouTube-видео' : 'Добавить YouTube-видео'}
          </h2>

          {session.invalid ? (
            <div className="mt-4 flex flex-col gap-4">
              <p className="rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
                Не удалось разобрать этот видеоблок. Текст урока не изменён.
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
            <form
  className="mt-5 flex flex-col gap-5"
  onSubmit={(event) => {
    event.preventDefault();
    event.stopPropagation();
    handleApply();
  }}
>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Ссылка на YouTube</span>
                <input
                  data-autofocus="true"
                  type="url"
                  value={url}
                  autoComplete="off"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={fieldClassName}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setFormError('');
                  }}
                  onBlur={() => {
                    if (url.trim() && !parseYoutubeVideoId(url)) {
                      setFormError('Некорректная ссылка YouTube');
                    }
                  }}
                />
              </label>

              {videoId ? (
                <div>
                  <p className="text-sm font-medium">Предпросмотр</p>
                  <TheoryYoutubeBlockView videoId={videoId} />
                </div>
              ) : null}

              {formError ? (
                <p className="rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-3">
                {session.replaceRange ? (
                  <button
                    type="button"
                    className={`${secondaryButtonClassName} mr-auto`}
                    onClick={handleDelete}
                  >
                    Удалить
                  </button>
                ) : null}
                <button type="button" className={secondaryButtonClassName} onClick={requestClose}>
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {session.replaceRange ? 'Сохранить' : 'Вставить'}
                </button>
              </div>
            </form>
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
        {insideBlock ? 'Настроить видео' : 'Добавить видео'}
      </button>
      {dialog}
    </>
  );
};
