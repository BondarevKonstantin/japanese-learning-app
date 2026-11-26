import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/auth/useAuth';
import { getCourseById } from '@/entities/course/api/getCourseById';
import { isGachaTestSpinEnabled } from '@/pages/gacha-play/model/gachaTestSpinFlag';

type CourseOwnership = {
  courseId: string;
  userId: string;
  isOwner: boolean;
};

export const useGachaTestSpinAccess = (courseId: string | undefined) => {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const canCheckAccess =
    isGachaTestSpinEnabled && profile?.role === 'teacher' && Boolean(userId) && Boolean(courseId);
  const [ownership, setOwnership] = useState<CourseOwnership | null>(null);

  useEffect(() => {
    if (!canCheckAccess || !courseId || !userId) {
      return;
    }

    let cancelled = false;

    void getCourseById(courseId)
      .then((course) => {
        if (!cancelled) {
          setOwnership({ courseId, userId, isOwner: course.created_by === userId });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOwnership({ courseId, userId, isOwner: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canCheckAccess, courseId, userId]);

  if (!canCheckAccess || !courseId || !userId) {
    return false;
  }

  return (
    ownership?.courseId === courseId && ownership.userId === userId && ownership.isOwner
  );
};
