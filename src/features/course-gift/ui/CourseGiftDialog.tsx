import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '@/app/providers/auth/useAuth';
import type { CourseGiftState } from '@/entities/course-gift/model/types';
import type { CourseGiftFormMode } from '@/features/course-gift/model/courseGiftForm';
import { useCourseGiftForm } from '@/features/course-gift/model/useCourseGiftForm';
import { lockBackgroundScroll } from '@/shared/lib/lockBackgroundScroll';

export type CourseGiftDialogProps = {
  courseId: string;
  mode?: CourseGiftFormMode;
  onClose: () => void;
  onSaved: (state: CourseGiftState) => void;
};

const fieldClassName =
  'w-full min-w-0 max-w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light';

const secondaryButtonClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-base font-medium text-text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto';

const primaryButtonClassName =
  'w-full rounded-2xl bg-primary px-4 py-3 text-base font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto';

const readOnlyValueClassName =
  'mt-2 min-w-0 break-words rounded-2xl border border-border bg-background px-4 py-3 text-base text-text-primary';

// Mount only after other modal dialogs, such as CourseFinaleViewer, have unmounted.
export const CourseGiftDialog = ({
  courseId,
  mode = 'student',
  onClose,
  onSaved,
}: CourseGiftDialogProps) => {
  const isPreview = mode === 'teacher-preview';
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const addressId = useId();
  const addressHintId = useId();
  const privacyHintId = useId();
  const fieldErrorId = useId();
  const { user, profile, profileError, isLoading: isAuthLoading } = useAuth();
  const form = useCourseGiftForm({
    courseId,
    mode,
    onSaved: (state) => {
      onSaved(state);
      onClose();
    },
  });

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

  const requestClose = () => {
    if (form.isSaving) {
      return;
    }

    onClose();
  };

  const trimmedName = profile?.display_name?.trim() ?? '';
  const displayName = isAuthLoading ? 'Загрузка...' : trimmedName || 'Имя не указано';
  const displayEmail = isAuthLoading
    ? 'Загрузка...'
    : profile?.email || user?.email || 'Email не указан';
  const addressDescribedBy = form.fieldError
    ? `${addressHintId} ${privacyHintId} ${fieldErrorId}`
    : `${addressHintId} ${privacyHintId}`;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-busy={form.isSaving}
      className="m-auto box-border max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl border border-border bg-surface p-4 text-text-primary shadow-sm backdrop:bg-black/60 sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div className="flex min-w-0 flex-col gap-5">
        {isPreview ? (
          <div className="rounded-3xl border border-primary bg-primary-light px-4 py-3 text-sm text-text-primary">
            <p className="font-semibold">Режим предпросмотра</p>
            <p className="mt-1">Это демонстрация формы. Адрес не отправляется и не сохраняется.</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id={titleId} className="min-w-0 flex-1 break-words text-xl font-semibold">
            Твой подарок из Японии!
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
            onClick={requestClose}
            disabled={form.isSaving}
          >
            Закрыть
          </button>
        </div>

        <p className="break-words text-sm text-text-secondary">
          Спасибо, что прошёл курс! Оставь адрес, чтобы мы смогли отправить тебе небольшой подарок.
        </p>

        {form.loadStatus === 'loading' ? (
          <p className="text-sm text-text-secondary">Загрузка данных подарка...</p>
        ) : null}

        {form.loadStatus === 'error' ? (
          <div className="flex flex-col items-start gap-3">
            <p
              className="break-words rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent"
              role="alert"
            >
              {form.loadError ?? 'Не удалось загрузить данные подарка.'}
            </p>
            <button type="button" className={secondaryButtonClassName} onClick={form.reload}>
              Повторить
            </button>
          </div>
        ) : null}

        {form.loadStatus === 'ready' && form.giftState ? (
          <form
            className="flex min-w-0 flex-col gap-5"
            autoComplete="off"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              form.submitAddress();
            }}
          >
            {profileError && !isAuthLoading ? (
              <p className="break-words text-sm text-accent">{profileError}</p>
            ) : null}

            {form.blockedMessage ? (
              <p className="break-words rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-secondary">
                {form.blockedMessage}
              </p>
            ) : null}

            {form.statusMessage ? (
              <p className="break-words rounded-2xl bg-primary-light px-4 py-3 text-sm text-text-primary">
                {form.statusMessage}
              </p>
            ) : null}

            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">Имя</p>
              <p className={readOnlyValueClassName}>{displayName}</p>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">Email</p>
              <p className={`${readOnlyValueClassName} break-all`}>{displayEmail}</p>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor={addressId} className="text-sm font-medium text-text-primary">
                Адрес доставки
              </label>
              <p id={addressHintId} className="break-words text-sm text-text-secondary">
                Укажи страну, город, улицу, дом, квартиру и почтовый индекс.
              </p>
              <textarea
                id={addressId}
                value={form.address}
                onChange={(event) => {
                  form.updateAddress(event.target.value);
                }}
                readOnly={!form.canSubmitAddress || form.isSaving}
                rows={4}
                aria-describedby={addressDescribedBy}
                aria-invalid={form.fieldError ? true : undefined}
                autoComplete="off"
                className={`${fieldClassName} min-h-32 resize-y ${
                  form.canSubmitAddress ? '' : 'text-text-secondary'
                }`}
              />
              <p id={privacyHintId} className="break-words text-sm text-text-secondary">
                Твой адрес будет доступен преподавателю курса и использован для отправки подарка.
              </p>
              {form.fieldError ? (
                <p id={fieldErrorId} className="break-words text-sm text-accent" role="alert">
                  {form.fieldError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="submit"
                className={primaryButtonClassName}
                disabled={!form.canSubmitAddress || form.isSaving}
              >
                {form.pendingAction === 'requested' ? 'Сохранение...' : 'Отправить данные'}
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={form.declineGift}
                disabled={!form.canDecline || form.isSaving}
              >
                {form.pendingAction === 'declined' ? 'Сохранение...' : 'Отказаться от подарка'}
              </button>
            </div>

            <p className="break-words text-sm text-text-secondary">
              Решение можно изменить позднее на странице курса.
            </p>
          </form>
        ) : null}
      </div>
    </dialog>,
    document.body,
  );
};
