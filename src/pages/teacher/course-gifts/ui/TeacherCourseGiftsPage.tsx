import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import type { CourseGiftClaim, CourseGiftStatus } from '@/entities/course-gift/model/types';
import { useTeacherCourseGiftClaims } from '@/pages/teacher/course-gifts/model/useTeacherCourseGiftClaims';
import { routes } from '@/shared/config/routes';
import { BackButton } from '@/shared/ui/BackButton';

const statusLabelMap: Record<CourseGiftStatus | 'pending', string> = {
  requested: 'Подарок запрошен',
  declined: 'Отказался от подарка',
  pending: 'Не принял решение',
};

const retryButtonClassName =
  'rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const refreshButtonClassName =
  'rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const studentDisplayName = (claim: CourseGiftClaim) => {
  const name = claim.display_name?.trim() ?? '';
  return name || 'Имя не указано';
};

const formatUpdatedAt = (value: string) => {
  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    return value;
  }

  return new Date(time).toLocaleString('ru-RU');
};

type ClaimCounts = {
  requested: number;
  declined: number;
  pending: number;
};

const countClaims = (claims: CourseGiftClaim[]): ClaimCounts => {
  const counts: ClaimCounts = { requested: 0, declined: 0, pending: 0 };

  for (const claim of claims) {
    if (claim.status === 'requested') {
      counts.requested += 1;
    } else if (claim.status === 'declined') {
      counts.declined += 1;
    } else {
      counts.pending += 1;
    }
  }

  return counts;
};

type CopyFeedback = {
  userId: string;
  ok: boolean;
};

export const TeacherCourseGiftsPage = () => {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const model = useTeacherCourseGiftClaims(courseIdParam);
  const feedbackScope = `${user?.id ?? ''}:${courseIdParam ?? ''}`;
  const [feedbackScopeId, setFeedbackScopeId] = useState(feedbackScope);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
  const [feedbackClaims, setFeedbackClaims] = useState(model.claims);
  const copyRequestRef = useRef(0);

  if (feedbackScopeId !== feedbackScope) {
    setFeedbackScopeId(feedbackScope);
    setCopyFeedback(null);
  }

  if (feedbackClaims !== model.claims) {
    setFeedbackClaims(model.claims);
    setCopyFeedback(null);
  }

  useLayoutEffect(() => {
    return () => {
      copyRequestRef.current += 1;
    };
  }, [feedbackScope, model.claims]);

  useEffect(() => {
    if (!copyFeedback?.ok) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopyFeedback((current) => (current?.ok ? null : current));
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copyFeedback]);

  const copyAddress = async (userId: string, address: string) => {
    const requestId = ++copyRequestRef.current;
    setCopyFeedback(null);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard unavailable');
      }

      await navigator.clipboard.writeText(address);

      if (requestId !== copyRequestRef.current) {
        return;
      }

      setCopyFeedback({ userId, ok: true });
    } catch {
      if (requestId !== copyRequestRef.current) {
        return;
      }

      setCopyFeedback({ userId, ok: false });
    }
  };

  if (!courseIdParam) {
    return (
      <AppLayout>
        <div className="p-6 text-accent">Course id не найден</div>
      </AppLayout>
    );
  }

  const claims = model.status === 'ready' ? (model.claims ?? []) : null;
  const counts = claims ? countClaims(claims) : null;
  const refreshDisabled =
    model.status === 'loading' || model.status === 'idle' || model.isRefreshing;

  return (
    <AppLayout>
      <div className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 break-words text-3xl font-bold text-text-primary">
              Подарки ученикам
            </h1>
            <p className="mt-2 break-words text-text-secondary">
              {model.courseTitle
                ? `Курс: ${model.courseTitle}`
                : 'Заявки учеников выбранного курса'}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              className={`${refreshButtonClassName} w-full sm:w-auto`}
              onClick={model.reload}
              disabled={refreshDisabled}
            >
              {model.isRefreshing ? 'Обновление...' : 'Обновить'}
            </button>
            <BackButton fallbackTo={routes.teacherCourses} label="К курсам" />
          </div>
        </div>

        {counts ? (
          <dl className="mt-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-sm">
              <dt className="break-words text-sm text-text-secondary">Запросили подарок</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-primary">{counts.requested}</dd>
            </div>
            <div className="min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-sm">
              <dt className="break-words text-sm text-text-secondary">Отказались</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-primary">{counts.declined}</dd>
            </div>
            <div className="min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-sm">
              <dt className="break-words text-sm text-text-secondary">Не приняли решение</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-primary">{counts.pending}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-6 min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          {model.status === 'loading' || model.status === 'idle' ? (
            <p className="text-text-secondary">Загрузка...</p>
          ) : null}

          {model.status === 'error' ? (
            <div className="flex min-w-0 flex-col items-start gap-3">
              <p className="break-words text-sm text-accent" role="alert">
                {model.errorMessage ?? 'Не удалось загрузить заявки на подарки.'}
              </p>
              <button type="button" className={retryButtonClassName} onClick={model.reload}>
                Повторить
              </button>
            </div>
          ) : null}

          {model.status === 'forbidden' ? (
            <p className="break-words text-sm text-accent" role="alert">
              {model.errorMessage ?? 'Нет доступа к заявкам этого курса.'}
            </p>
          ) : null}

          {model.status === 'unconfigured' ? (
            <p className="break-words text-sm text-text-secondary" role="status">
              {model.errorMessage ?? 'Подарки для этого курса не настроены.'}
            </p>
          ) : null}

          {claims && claims.length === 0 ? (
            <p className="break-words text-text-secondary">
              Пока нет учеников, завершивших курс или оставивших заявку на подарок.
            </p>
          ) : null}

          {claims && claims.length > 0 ? (
            <div className="grid min-w-0 gap-4">
              {claims.map((claim, index) => {
                const statusKey = claim.status ?? 'pending';
                const showDecisionDate = claim.status !== null && claim.updated_at !== null;
                const showAddress = claim.status === 'requested' && claim.shipping_address !== null;
                const showIneligibleNote = claim.eligible === false && claim.status !== null;
                const feedback = copyFeedback?.userId === claim.user_id ? copyFeedback : null;

                return (
                  <article
                    key={`${claim.user_id}:${index}`}
                    className="min-w-0 rounded-3xl border border-border bg-background p-4 sm:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-semibold text-text-primary">
                          {studentDisplayName(claim)}
                        </h2>
                        <p className="mt-1 break-all text-sm text-text-secondary">{claim.email}</p>
                      </div>
                      <p className="shrink-0 text-sm font-medium text-text-primary">
                        {statusLabelMap[statusKey]}
                      </p>
                    </div>

                    {showDecisionDate && claim.updated_at ? (
                      <p className="mt-3 break-words text-sm text-text-secondary">
                        Последнее изменение: {formatUpdatedAt(claim.updated_at)}
                      </p>
                    ) : null}

                    {showAddress && claim.shipping_address ? (
                      <div className="mt-4 min-w-0">
                        <p className="text-sm font-medium text-text-primary">Адрес доставки</p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-primary">
                          {claim.shipping_address}
                        </p>
                        <button
                          type="button"
                          className={`${retryButtonClassName} mt-3 w-full sm:w-auto`}
                          onClick={() => {
                            const address = claim.shipping_address;

                            if (!address) {
                              return;
                            }

                            void copyAddress(claim.user_id, address);
                          }}
                        >
                          Копировать адрес
                        </button>
                        {feedback?.ok ? (
                          <p className="mt-2 text-sm text-text-secondary" role="status">
                            Адрес скопирован
                          </p>
                        ) : null}
                        {feedback && !feedback.ok ? (
                          <p className="mt-2 break-words text-sm text-accent" role="alert">
                            Не удалось скопировать адрес
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {showIneligibleNote ? (
                      <p className="mt-4 break-words text-sm text-text-secondary">
                        Сейчас ученик не имеет права повторно запросить подарок.
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
};
