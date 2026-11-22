import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import {
  getUserCourseGachaOverview,
  type UserCourseGachaOverview,
} from '@/features/gacha/api/getUserCourseGachaOverview';
import { routes } from '@/shared/config/routes';

export const GachaPage = () => {
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const userId = user?.id;

  const [overview, setOverview] = useState<UserCourseGachaOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadOverview = useCallback(async (targetCourseId: string, targetUserId: string) => {
    try {
      const nextOverview = await getUserCourseGachaOverview(targetCourseId, targetUserId);
      setErrorMessage('');
      setOverview(nextOverview);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить состояние гачи';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!courseId || !userId) {
      return;
    }

    // State updates happen after the asynchronous Supabase request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOverview(courseId, userId);
  }, [courseId, loadOverview, userId]);

  const totalCards = overview?.totalCards ?? 0;
  const unlockedCount = overview?.unlockedCount ?? 0;
  const availablePulls = overview?.availablePulls ?? 0;
  const usedPulls = overview?.usedPulls ?? 0;
  const completed = overview?.completed ?? false;

  const progressPercent = totalCards > 0 ? (unlockedCount / totalCards) * 100 : 0;

  if (!courseId) {
    return (
      <AppLayout>
        <div className="p-6 text-accent">Course id не найден</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Student panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Гача курса</h1>
            <p className="mt-2 text-text-secondary">
              Крути гачу, открывай карты и собирай коллекцию
            </p>
          </div>

        </div>

        <div className="mt-8 min-h-0 flex-1">
          <div className="flex min-h-0 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-text-primary">Прогресс</h2>

            {isLoading ? (
              <p className="mt-6 text-text-secondary">Загрузка...</p>
            ) : (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-3xl border border-border bg-background p-4">
                    <p className="text-sm text-text-secondary">Доступно круток</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">{availablePulls}</p>
                  </div>

                  <div className="rounded-3xl border border-border bg-background p-4">
                    <p className="text-sm text-text-secondary">Использовано</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">{usedPulls}</p>
                  </div>

                  <div className="rounded-3xl border border-border bg-background p-4">
                    <p className="text-sm text-text-secondary">Открыто карт</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">
                      {unlockedCount} / {totalCards}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-border bg-background p-4">
                    <p className="text-sm text-text-secondary">Коллекция</p>
                    <p className="mt-2 text-2xl font-bold text-text-primary">
                      {completed ? 'Собрана' : 'Не собрана'}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="h-3 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-text-secondary">
                    Прогресс коллекции: {unlockedCount} из {totalCards}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={routes.courseGachaPlay.replace(':courseId', courseId)}
                    className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90"
                  >
                    Крутить
                  </Link>

                  <Link
                    to={routes.courseCollection.replace(':courseId', courseId)}
                    className="rounded-2xl border border-border bg-surface px-5 py-3 font-medium text-text-primary transition hover:bg-background"
                  >
                    Открыть коллекцию
                  </Link>
                </div>

                {!errorMessage && (totalCards === 0 || availablePulls === 0) ? (
                  <p className="mt-4 text-sm text-text-secondary">
                    {totalCards === 0
                      ? 'У этого курса пока нет гача-карт.'
                      : 'Сейчас нет доступных круток.'}
                  </p>
                ) : null}
              </>
            )}

            {errorMessage ? (
              <p className="mt-4 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
