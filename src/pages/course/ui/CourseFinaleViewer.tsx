import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { COURSE_FINALE_IMAGE } from '@/shared/config/courseStory';
import { lockBackgroundScroll } from '@/shared/lib/lockBackgroundScroll';

type CourseFinaleViewerProps = {
  onClose: () => void;
  onComplete: () => void;
};

const controlClassName =
  'rounded-2xl border border-border bg-background px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface disabled:cursor-default disabled:opacity-40';

export const CourseFinaleViewer = ({ onClose, onComplete }: CourseFinaleViewerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    closeButtonRef.current?.focus();
    const unlock = lockBackgroundScroll(dialog);

    return () => {
      unlock();
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const requestClose = () => {
    onClose();
  };

  const resetFrameScroll = () => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    frame.scrollTop = 0;
    frame.scrollLeft = 0;
  };

  const finishFinale = () => {
    if (!imageLoaded || imageFailed) {
      requestClose();
      return;
    }

    onComplete();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="course-finale-title"
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-full overflow-hidden border-0 bg-black p-0 text-text-primary backdrop:bg-black/80"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-surface px-3 py-2 sm:px-4">
          <p id="course-finale-title" className="text-sm text-text-secondary">
            Поздравление с завершением курса
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={controlClassName}
              onClick={() => {
                setZoomed((current) => !current);
                resetFrameScroll();
              }}
              disabled={imageFailed}
            >
              {zoomed ? 'Обычный размер' : 'Увеличить'}
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              className={controlClassName}
              onClick={requestClose}
            >
              Закрыть
            </button>
          </div>
        </div>

        <div
          ref={frameRef}
          className={`min-h-0 w-full flex-1 overscroll-contain bg-black ${
            zoomed ? 'overflow-auto' : 'overflow-hidden'
          }`}
        >
          {imageFailed ? (
            <div className="flex h-full items-center justify-center p-4">
              <p className="max-w-md rounded-2xl bg-surface px-4 py-3 text-center text-sm text-text-primary">
                Не удалось показать поздравление. Окно можно закрыть и продолжить курс.
              </p>
            </div>
          ) : zoomed ? (
            <img
              src={COURSE_FINALE_IMAGE.src}
              alt={COURSE_FINALE_IMAGE.alt}
              draggable={false}
              className="mx-auto h-auto w-[220%] max-w-none object-contain sm:w-[160%]"
              onLoad={() => {
                setImageLoaded(true);
                setImageFailed(false);
              }}
              onError={() => {
                setImageFailed(true);
                setImageLoaded(false);
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 sm:p-4">
              <img
                src={COURSE_FINALE_IMAGE.src}
                alt={COURSE_FINALE_IMAGE.alt}
                draggable={false}
                className="h-auto max-h-full min-h-0 w-auto min-w-0 max-w-full object-contain"
                onLoad={() => {
                  setImageLoaded(true);
                  setImageFailed(false);
                }}
                onError={() => {
                  setImageFailed(true);
                  setImageLoaded(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end bg-surface px-3 py-2 sm:px-4">
          <button
            type="button"
            className="rounded-2xl bg-primary px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
            onClick={finishFinale}
          >
            Завершить просмотр
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
};
