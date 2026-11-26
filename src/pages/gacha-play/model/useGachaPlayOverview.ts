import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/providers/auth/useAuth';
import type { SpinGachaResult } from '@/entities/gacha/model/types';
import {
  getUserCourseGachaOverview,
  type UserCourseGachaOverview,
} from '@/features/gacha/api/getUserCourseGachaOverview';

type OverviewScope = {
  courseId: string | undefined;
  userId: string | undefined;
};

const overviewFromSpin = (result: SpinGachaResult): UserCourseGachaOverview => ({
  availablePulls: result.state.available_pulls,
  usedPulls: result.state.used_pulls,
  totalPullsEarned: result.state.total_pulls_earned,
  unlockedCount: result.collection.unlocked_count,
  totalCards: result.collection.total_count,
  completed: result.collection.completed,
});

export const useGachaPlayOverview = (courseId: string | undefined) => {
  const { user } = useAuth();
  const userId = user?.id;
  const scopeRef = useRef<OverviewScope>({ courseId, userId });
  const generationRef = useRef(0);
  const [scope, setScope] = useState<OverviewScope>({ courseId, userId });
  const [overview, setOverview] = useState<UserCourseGachaOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const scopeChanged = scope.courseId !== courseId || scope.userId !== userId;

  if (scopeChanged) {
    setScope({ courseId, userId });
    setOverview(null);
    setIsLoading(true);
    setErrorMessage('');
  }

  useLayoutEffect(() => {
    scopeRef.current = { courseId, userId };
    generationRef.current += 1;
  }, [courseId, userId]);

  const loadOverview = useCallback(async (targetCourseId: string, targetUserId: string) => {
    const generation = generationRef.current;
    const isCurrent = () =>
      generation === generationRef.current &&
      scopeRef.current.courseId === targetCourseId &&
      scopeRef.current.userId === targetUserId;

    try {
      const nextOverview = await getUserCourseGachaOverview(targetCourseId, targetUserId);

      if (!isCurrent()) {
        return;
      }

      setErrorMessage('');
      setOverview(nextOverview);
    } catch (error) {
      if (!isCurrent()) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить состояние гачи';
      setErrorMessage(message);
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
      }
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

  const applySpinResult = useCallback((targetCourseId: string, result: SpinGachaResult) => {
    if (
      scopeRef.current.courseId !== targetCourseId ||
      scopeRef.current.userId === undefined
    ) {
      return;
    }

    generationRef.current += 1;
    setErrorMessage('');
    setIsLoading(false);
    setOverview(overviewFromSpin(result));
  }, []);

  const reloadOverview = useCallback(
    async (targetCourseId: string) => {
      const currentUserId = scopeRef.current.userId;

      if (!currentUserId || scopeRef.current.courseId !== targetCourseId) {
        return;
      }

      await loadOverview(targetCourseId, currentUserId);
    },
    [loadOverview],
  );

  const isAwaitingUser = Boolean(courseId) && !userId;
  const displayedOverview = scopeChanged ? null : overview;
  const displayedError = scopeChanged ? '' : errorMessage;

  return {
    overview: displayedOverview,
    isLoading: Boolean(courseId && userId) && (scopeChanged || isLoading),
    errorMessage: isAwaitingUser ? 'Пользователь не найден' : displayedError,
    applySpinResult,
    reloadOverview,
  };
};
