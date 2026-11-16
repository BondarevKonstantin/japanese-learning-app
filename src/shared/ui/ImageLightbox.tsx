import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { lockBackgroundScroll } from '@/shared/lib/lockBackgroundScroll';

export type LightboxImage = {
  src: string;
  alt: string;
};

type ImageLightboxProps = {
  image: LightboxImage | null;
  onClose: () => void;
};

export const ImageLightbox = ({ image, onClose }: ImageLightboxProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const ignoreCloseRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!image) {
      if (dialog.open) {
        ignoreCloseRef.current = true;
        dialog.close();
        ignoreCloseRef.current = false;
      }
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    closeButtonRef.current?.focus();

    return lockBackgroundScroll(dialog);
  }, [image]);

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      ignoreCloseRef.current = true;
      dialog.close();
      ignoreCloseRef.current = false;
    }
    onClose();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label={image?.alt || 'Увеличенное изображение'}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-text-primary overscroll-contain backdrop:bg-black/75"
      onClose={() => {
        if (ignoreCloseRef.current) {
          return;
        }
        onClose();
      }}
    >
      {image ? (
        <div
          className="flex h-full w-full items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              requestClose();
            }
          }}
        >
          <div className="flex max-w-full flex-col items-end gap-3">
            <button
              ref={closeButtonRef}
              type="button"
              className="rounded-2xl bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={requestClose}
            >
              Закрыть
            </button>
            <img
              src={image.src}
              alt={image.alt}
              className="h-auto max-h-[calc(100dvh-6rem)] w-auto max-w-[92vw] object-contain"
            />
          </div>
        </div>
      ) : null}
    </dialog>,
    document.body,
  );
};
