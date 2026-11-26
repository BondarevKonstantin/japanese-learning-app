import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { COURSE_STORY_SLIDES } from '@/shared/config/courseStory';
import { lockBackgroundScroll } from '@/shared/lib/lockBackgroundScroll';

type CourseIntroViewerProps = {
  onClose: () => void;
  onComplete: () => void;
};

const controlClassName =
  'rounded-2xl border border-border bg-background px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface disabled:cursor-default disabled:opacity-40';

export const CourseIntroViewer = ({ onClose, onComplete }: CourseIntroViewerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [loadedSlideIndexes, setLoadedSlideIndexes] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const slide = COURSE_STORY_SLIDES[slideIndex] ?? COURSE_STORY_SLIDES[0];
  const isLastSlide = slideIndex === COURSE_STORY_SLIDES.length - 1;

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

  const markSlideFailed = (index: number) => {
    setImageFailed(true);
    setLoadedSlideIndexes((current) => {
      if (!current.has(index)) {
        return current;
      }

      const next = new Set(current);
      next.delete(index);
      return next;
    });
  };

  const markSlideLoaded = (index: number) => {
    setLoadedSlideIndexes((current) => {
      if (current.has(index)) {
        return current;
      }

      const next = new Set(current);
      next.add(index);
      return next;
    });
  };

  const showSlide = (nextIndex: number) => {
    setSlideIndex(nextIndex);
    setZoomed(false);
    setImageFailed(false);
    resetFrameScroll();
  };

  const finishIntro = () => {
    const allSlidesLoaded = COURSE_STORY_SLIDES.every((_, index) => loadedSlideIndexes.has(index));

    if (!allSlidesLoaded) {
      requestClose();
      return;
    }

    onComplete();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="course-intro-title"
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-full overflow-hidden border-0 bg-black p-0 text-text-primary backdrop:bg-black/80"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-surface px-3 py-2 sm:px-4">
          <p id="course-intro-title" className="text-sm text-text-secondary">
            Слайд {slideIndex + 1} из {COURSE_STORY_SLIDES.length}
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
                Не удалось показать этот слайд. Окно можно закрыть и продолжить курс.
              </p>
            </div>
          ) : zoomed ? (
            <img
              src={slide.src}
              alt={slide.alt}
              draggable={false}
              className="mx-auto h-auto w-[220%] max-w-none object-contain sm:w-[160%]"
              onLoad={() => markSlideLoaded(slideIndex)}
              onError={() => markSlideFailed(slideIndex)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 sm:p-4">
              <img
                src={slide.src}
                alt={slide.alt}
                draggable={false}
                className="h-auto max-h-full min-h-0 w-auto min-w-0 max-w-full object-contain"
                onLoad={() => markSlideLoaded(slideIndex)}
                onError={() => markSlideFailed(slideIndex)}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-surface px-3 py-2 sm:px-4">
          <button
            type="button"
            className={controlClassName}
            onClick={() => showSlide(slideIndex - 1)}
            disabled={slideIndex === 0}
          >
            Назад
          </button>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {COURSE_STORY_SLIDES.map((item, index) => (
              <span
                key={item.src}
                className={
                  index === slideIndex
                    ? 'h-1.5 w-4 rounded-full bg-primary'
                    : 'h-1.5 w-1.5 rounded-full bg-border'
                }
              />
            ))}
          </div>
          {isLastSlide ? (
            <button
              type="button"
              className="rounded-2xl bg-primary px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
              onClick={finishIntro}
            >
              Начать курс
            </button>
          ) : (
            <button
              type="button"
              className={controlClassName}
              onClick={() => showSlide(slideIndex + 1)}
            >
              Далее
            </button>
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
};
