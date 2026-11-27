import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/providers/auth/useAuth';
import { getCourseById } from '@/entities/course/api/getCourseById';
import {
  CourseGiftClaimsRequestError,
  courseGiftClaimsAccessDeniedCode,
  courseGiftClaimsNotConfiguredCode,
  getCourseGiftClaims,
} from '@/entities/course-gift/api/getCourseGiftClaims';
import { invalidCourseGiftClaimsMessage } from '@/entities/course-gift/api/parseCourseGiftClaims';
import type { CourseGiftClaim } from '@/entities/course-gift/model/types';

export type TeacherCourseGiftClaimsStatus =
  'idle' | 'loading' | 'ready' | 'error' | 'forbidden' | 'unconfigured';

export type TeacherCourseGiftClaimsModel = {
  status: TeacherCourseGiftClaimsStatus;
  courseTitle: string | null;
  claims: CourseGiftClaim[] | null;
  errorMessage: string | null;
  isRefreshing: boolean;
  reload: () => void;
};

type ClaimsScope = {
  courseId: string | null;
  userId: string | null;
};

const accessDeniedMessage = 'Нет доступа к заявкам этого курса.';
const notConfiguredMessage = 'Подарки для этого курса не настроены.';
const courseLoadErrorMessage = 'Не удалось загрузить курс.';
const claimsLoadErrorMessage = 'Не удалось загрузить заявки на подарки.';

const isAccessDenied = (error: unknown) => {
  return (
    error instanceof CourseGiftClaimsRequestError && error.code === courseGiftClaimsAccessDeniedCode
  );
};

const isNotConfigured = (error: unknown) => {
  return (
    error instanceof CourseGiftClaimsRequestError &&
    error.code === courseGiftClaimsNotConfiguredCode
  );
};

const claimsErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message === invalidCourseGiftClaimsMessage) {
    return invalidCourseGiftClaimsMessage;
  }

  return fallback;
};

export const useTeacherCourseGiftClaims = (
  courseId: string | undefined,
): TeacherCourseGiftClaimsModel => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const normalizedCourseId = courseId?.trim() ? courseId : null;
  const scopeId = `${userId ?? ''}:${normalizedCourseId ?? ''}`;
  const canLoad = Boolean(userId && normalizedCourseId);

  const [activeScope, setActiveScope] = useState(scopeId);
  const [status, setStatus] = useState<TeacherCourseGiftClaimsStatus>(canLoad ? 'loading' : 'idle');
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [claims, setClaims] = useState<CourseGiftClaim[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);
  const scopeRef = useRef<ClaimsScope>({ courseId: normalizedCourseId, userId });
  const claimsRef = useRef<CourseGiftClaim[] | null>(null);

  if (activeScope !== scopeId) {
    setActiveScope(scopeId);
    setStatus(canLoad ? 'loading' : 'idle');
    setCourseTitle(null);
    setClaims(null);
    setErrorMessage(null);
    setIsRefreshing(false);
  }

  useLayoutEffect(() => {
    scopeRef.current = { courseId: normalizedCourseId, userId };
    claimsRef.current = claims;
  });

  useLayoutEffect(() => {
    return () => {
      requestRef.current += 1;
    };
  }, [scopeId]);

  useEffect(() => {
    if (!normalizedCourseId || !userId) {
      return;
    }

    const requestId = ++requestRef.current;
    const targetCourseId = normalizedCourseId;
    const targetUserId = userId;
    const keepCourseTitle = claimsRef.current !== null;
    let ignore = false;

    const isCurrent = () => {
      return (
        !ignore &&
        requestId === requestRef.current &&
        scopeRef.current.courseId === targetCourseId &&
        scopeRef.current.userId === targetUserId
      );
    };

    const applyFailure = (
      message: string,
      nextStatus: TeacherCourseGiftClaimsStatus,
      keepTitle = false,
    ) => {
      if (!keepTitle) {
        setCourseTitle(null);
      }

      setClaims(null);
      setErrorMessage(message);
      setIsRefreshing(false);
      setStatus(nextStatus);
    };

    const load = async () => {
      try {
        const course = await getCourseById(targetCourseId);

        if (!isCurrent()) {
          return;
        }

        if (course.created_by !== targetUserId) {
          applyFailure(accessDeniedMessage, 'forbidden');
          return;
        }

        setCourseTitle(course.title);

        try {
          const nextClaims = await getCourseGiftClaims(targetCourseId);

          if (!isCurrent()) {
            return;
          }

          setClaims(nextClaims);
          setErrorMessage(null);
          setIsRefreshing(false);
          setStatus('ready');
        } catch (error: unknown) {
          if (!isCurrent()) {
            return;
          }

          if (isAccessDenied(error)) {
            applyFailure(accessDeniedMessage, 'forbidden', true);
            return;
          }

          if (isNotConfigured(error)) {
            applyFailure(notConfiguredMessage, 'unconfigured', true);
            return;
          }

          console.error('Failed to load course gift claims');
          applyFailure(claimsErrorMessage(error, claimsLoadErrorMessage), 'error', true);
        }
      } catch {
        if (!isCurrent()) {
          return;
        }

        console.error('Failed to load course gift claims');
        applyFailure(courseLoadErrorMessage, 'error', keepCourseTitle);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [normalizedCourseId, reloadKey, userId]);

  const reload = () => {
    if (!normalizedCourseId || !userId) {
      return;
    }

    const refreshing = claims !== null && status === 'ready';
    setErrorMessage(null);
    setIsRefreshing(refreshing);

    if (!refreshing) {
      setStatus('loading');
      setClaims(null);
      setCourseTitle(null);
    }

    setReloadKey((current) => current + 1);
  };

  return {
    status,
    courseTitle,
    claims,
    errorMessage,
    isRefreshing,
    reload,
  };
};
