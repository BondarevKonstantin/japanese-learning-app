import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import { addTestPulls } from '@/features/gacha/api/addTestPulls';
import {
  getUserCourseGachaOverview,
  type UserCourseGachaOverview,
} from '@/features/gacha/api/getUserCourseGachaOverview';
import { spinGacha } from '@/features/gacha/api/spinGacha';
import type { GachaCard, GachaCardRarity } from '@/entities/gacha-card/model/types';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';

import { useParams, Link } from 'react-router-dom';
import { routes } from '@/shared/config/routes';

const rarityLabelMap: Record<GachaCardRarity, string> = {
  common: 'Обычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная',
};

const rarityClassMap: Record<GachaCardRarity, string> = {
  common: 'border-border bg-background text-text-primary',
  rare: 'border-primary bg-primary-light text-text-primary',
  epic: 'border-accent bg-secondary text-accent',
  legendary: 'border-accent bg-accent text-white',
};

export const GachaPage = () => {
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();

  const [overview, setOverview] = useState<UserCourseGachaOverview | null>(null);
  const [lastCard, setLastCard] = useState<GachaCard | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAddingPulls, setIsAddingPulls] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadOverview = useCallback(async () => {
    if (!user?.id) {
      setErrorMessage('Пользователь не найден');
      setIsLoading(false);
      return;
    }

    if (!courseId) return;

    setErrorMessage('');

    try {
      const nextOverview = await getUserCourseGachaOverview(courseId, user.id);
      setOverview(nextOverview);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить состояние гачи';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, courseId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleSpin = async () => {
    setErrorMessage('');
    setIsSpinning(true);

    if (!courseId) return;

    try {
      const result = await spinGacha(courseId);

      setLastCard(result.card);
      setOverview({
        availablePulls: result.state.available_pulls,
        usedPulls: result.state.used_pulls,
        totalPullsEarned: result.state.total_pulls_earned,
        unlockedCount: result.progress.unlocked,
        totalCards: result.progress.total,
        completed: result.progress.completed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить крутку';
      setErrorMessage(message);
    } finally {
      setIsSpinning(false);
    }
  };

  const handleAddTestPulls = async () => {
    setErrorMessage('');
    setIsAddingPulls(true);

    if (!courseId) return;

    try {
      await addTestPulls(courseId, 10);
      await loadOverview();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось начислить тестовые крутки';
      setErrorMessage(message);
    } finally {
      setIsAddingPulls(false);
    }
  };

  const totalCards = overview?.totalCards ?? 0;
  const unlockedCount = overview?.unlockedCount ?? 0;
  const availablePulls = overview?.availablePulls ?? 0;
  const usedPulls = overview?.usedPulls ?? 0;
  const completed = overview?.completed ?? false;

  const progressPercent = totalCards > 0 ? (unlockedCount / totalCards) * 100 : 0;

  const canSpin = !isLoading && !isSpinning && totalCards > 0 && availablePulls > 0 && !completed;

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

          <LogoutButton />
        </div>

        <div className="mt-8 grid min-h-0 flex-1 gap-8 lg:grid-cols-[1fr_380px]">
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
                  <button
                    type="button"
                    onClick={handleSpin}
                    disabled={!canSpin}
                    className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSpinning ? 'Крутим...' : 'Крутить'}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddTestPulls}
                    disabled={isAddingPulls}
                    className="rounded-2xl border border-border bg-surface px-5 py-3 font-medium text-text-primary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAddingPulls ? 'Начисляем...' : 'Добавить 10 тестовых круток'}
                  </button>
                  <Link
                    to={routes.courseGacha}
                    className="rounded-2xl border border-border bg-surface px-5 py-3 font-medium text-text-primary transition hover:bg-background"
                  >
                    Открыть коллекцию
                  </Link>
                </div>

                {!errorMessage && !canSpin ? (
                  <p className="mt-4 text-sm text-text-secondary">
                    {completed
                      ? 'Коллекция уже собрана.'
                      : totalCards === 0
                        ? 'У этого курса пока нет гача-карт.'
                        : availablePulls === 0
                          ? 'Сейчас нет доступных круток.'
                          : ''}
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

          <div className="flex min-h-0 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-text-primary">Последняя карта</h2>

              {lastCard ? (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${rarityClassMap[lastCard.rarity]}`}
                >
                  {rarityLabelMap[lastCard.rarity]}
                </span>
              ) : null}
            </div>

            {!lastCard ? (
              <div className="mt-6 flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-border bg-background px-6 text-center text-text-secondary">
                После первой крутки здесь появится выпавшая карта
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-background">
                <div className="aspect-[3/4] bg-surface">
                  <img
                    src={lastCard.image_url}
                    alt={lastCard.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-text-primary">{lastCard.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    Редкость: {rarityLabelMap[lastCard.rarity]}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
