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

const finaleGiftButtonStyle = {
  left: 'calc(632 / 1536 * 100%)',
  top: 'calc(693 / 1024 * 100%)',
  width: 'calc(545 / 1536 * 100%)',
  height: 'calc(107 / 1024 * 100%)',
} as const;

export const CourseFinaleViewer = ({ onClose, onComplete }: CourseFinaleViewerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
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

    const unlock = lockBackgroundScroll(dialog);

    return () => {
      unlock();
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    const image = imageRef.current;

    if (image?.complete && image.naturalWidth > 0) {
      setImageLoaded(true);
      setImageFailed(false);
    }
  }, []);

  const requestClose = () => {
    onClose();
  };

  const markImageLoaded = () => {
    setImageLoaded(true);
    setImageFailed(false);
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
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-full overflow-hidden border-0 bg-[#fff6f8] p-0 text-text-primary backdrop:bg-[#fff6f8]"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <h2 id="course-finale-title" className="sr-only">
          Поздравление с завершением курса
        </h2>

        <div className="relative min-h-0 w-full flex-1 overflow-hidden overscroll-contain bg-[#fff6f8]">
          {imageFailed ? (
            <div className="flex h-full items-center justify-center p-4">
              <div className="flex max-w-md flex-wrap items-center justify-center gap-3">
                <p className="rounded-2xl bg-surface px-4 py-3 text-center text-sm text-text-primary">
                  Не удалось показать поздравление. Окно можно закрыть и продолжить курс.
                </p>
                <button type="button" className={controlClassName} onClick={requestClose}>
                  Закрыть
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 grid place-items-center [container-type:size]">
              <div
                className="relative"
                style={{ aspectRatio: '3 / 2', width: 'min(100cqw, 150cqh)' }}
              >
                <img
                  ref={imageRef}
                  src={COURSE_FINALE_IMAGE.src}
                  alt={COURSE_FINALE_IMAGE.alt}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain"
                  onLoad={markImageLoaded}
                  onError={() => {
                    setImageFailed(true);
                    setImageLoaded(false);
                  }}
                />
                {imageLoaded ? (
                  <button
                    type="button"
                    aria-label="Заполнить данные"
                    className="absolute cursor-pointer rounded-2xl border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset focus-visible:outline-none"
                    style={finaleGiftButtonStyle}
                    onClick={finishFinale}
                  />
                ) : null}
              </div>
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
