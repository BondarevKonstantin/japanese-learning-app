import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/auth/useAuth';
import {
  getUserCourseGachaOverview,
  type UserCourseGachaOverview,
} from '@/features/gacha/api/getUserCourseGachaOverview';

export const useGachaPlayOverview = (courseId: string | undefined) => {
  const { user } = useAuth();
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

  const isAwaitingUser = Boolean(courseId) && !userId;

  return {
    overview,
    isLoading: Boolean(courseId && userId) && isLoading,
    errorMessage: isAwaitingUser ? 'Пользователь не найден' : errorMessage,
  };
};
