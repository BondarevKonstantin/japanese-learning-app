import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { getMyCourseGift } from '@/entities/course-gift/api/getMyCourseGift';
import type { CourseGiftState, CourseGiftSummary } from '@/entities/course-gift/model/types';

export type CourseGiftSummaryStatus = 'idle' | 'loading' | 'ready' | 'error';

type UseCourseGiftSummaryParams = {
  courseId: string | null;
  userId: string | null;
  enabled: boolean;
};

export type CourseGiftSummaryModel = {
  status: CourseGiftSummaryStatus;
  errorMessage: string | null;
  state: CourseGiftSummary | null;
  applySaved: (state: CourseGiftState) => void;
  reload: () => void;
};

type GiftSummaryScope = {
  courseId: string | null;
  userId: string | null;
};

const readErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const toSummaryState = (next: CourseGiftState): CourseGiftSummary => ({
  enabled: next.enabled,
  eligible: next.eligible,
  status: next.status,
  updated_at: next.updated_at,
});

export const useCourseGiftSummary = ({
  courseId,
  userId,
  enabled,
}: UseCourseGiftSummaryParams): CourseGiftSummaryModel => {
  const scopeId = `${enabled ? 'on' : 'off'}:${userId ?? ''}:${courseId ?? ''}`;
  const [activeScope, setActiveScope] = useState(scopeId);
  const [status, setStatus] = useState<CourseGiftSummaryStatus>(
    enabled && courseId && userId ? 'loading' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<CourseGiftSummary | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);
  const scopeRef = useRef<GiftSummaryScope>({ courseId, userId });

  if (activeScope !== scopeId) {
    setActiveScope(scopeId);
    setState(null);
    setErrorMessage(null);
    setStatus(enabled && courseId && userId ? 'loading' : 'idle');
  }

  useLayoutEffect(() => {
    scopeRef.current = { courseId, userId };
  });

  useLayoutEffect(() => {
    return () => {
      requestRef.current += 1;
    };
  }, [scopeId]);

  useEffect(() => {
    if (!enabled || !courseId || !userId) {
      return;
    }

    const requestId = ++requestRef.current;
    const targetCourseId = courseId;
    const targetUserId = userId;
    let ignore = false;

    const isCurrent = () => {
      return (
        !ignore &&
        requestId === requestRef.current &&
        scopeRef.current.courseId === targetCourseId &&
        scopeRef.current.userId === targetUserId
      );
    };

    const load = async () => {
      try {
        const next = await getMyCourseGift(targetCourseId);

        if (!isCurrent()) {
          return;
        }

        setState(toSummaryState(next));
        setErrorMessage(null);
        setStatus('ready');
      } catch (error: unknown) {
        if (!isCurrent()) {
          return;
        }

        console.error('Failed to load course gift');
        setStatus('error');
        setErrorMessage(readErrorMessage(error, 'Не удалось загрузить данные подарка.'));
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [courseId, enabled, reloadKey, userId]);

  const applySaved = (next: CourseGiftState) => {
    requestRef.current += 1;
    setState(toSummaryState(next));
    setErrorMessage(null);
    setStatus('ready');
  };

  const reload = () => {
    if (!enabled || !courseId || !userId) {
      return;
    }

    setErrorMessage(null);
    setStatus((current) => (current === 'ready' ? current : 'loading'));
    setReloadKey((current) => current + 1);
  };

  return {
    status,
    errorMessage,
    state,
    applySaved,
    reload,
  };
};
