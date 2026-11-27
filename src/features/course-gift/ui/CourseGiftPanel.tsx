import type { CourseGiftSummary } from '@/entities/course-gift/model/types';
import { getCourseGiftPanelModel } from '@/features/course-gift/model/courseGiftForm';
import type { CourseGiftSummaryStatus } from '@/features/course-gift/model/useCourseGiftSummary';

type CourseGiftPanelProps = {
  status: CourseGiftSummaryStatus;
  errorMessage: string | null;
  state: CourseGiftSummary | null;
  onRetry: () => void;
  onOpen: () => void;
};

const retryButtonClassName =
  'rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export const CourseGiftPanel = ({
  status,
  errorMessage,
  state,
  onRetry,
  onOpen,
}: CourseGiftPanelProps) => {
  if (status === 'idle') {
    return null;
  }

  const panel = state ? getCourseGiftPanelModel(state) : null;

  if (!panel && status === 'loading') {
    return <p className="text-sm text-text-secondary">Загрузка данных подарка...</p>;
  }

  if (!panel && status === 'error') {
    return (
      <div className="min-w-0 rounded-3xl border border-accent bg-secondary p-6 shadow-sm">
        <p className="break-words text-sm text-accent" role="alert">
          {errorMessage ?? 'Не удалось загрузить данные подарка.'}
        </p>
        <button type="button" className={`${retryButtonClassName} mt-4`} onClick={onRetry}>
          Повторить
        </button>
      </div>
    );
  }

  if (!panel) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-3xl border border-border bg-surface p-6 shadow-sm">
      {status === 'error' ? (
        <div className="mb-4 flex min-w-0 flex-col items-start gap-3">
          <p className="break-words text-sm text-accent" role="alert">
            {errorMessage ?? 'Не удалось обновить данные подарка.'}
          </p>
          <button type="button" className={retryButtonClassName} onClick={onRetry}>
            Повторить
          </button>
        </div>
      ) : null}
      <h2 className="break-words text-xl font-semibold text-text-primary">{panel.title}</h2>
      <p className="mt-2 break-words text-sm leading-6 text-text-secondary">{panel.description}</p>
      {panel.actionLabel ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-center font-medium text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {panel.actionLabel}
        </button>
      ) : null}
    </div>
  );
};
