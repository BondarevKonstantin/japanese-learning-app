import { getPublishedLessonsByCourse } from '@/entities/lesson/api/getPublishedLessonsByCourse';
import { supabase } from '@/shared/api/supabase/client';

const readCompletedLessonIds = (value: unknown): ReadonlySet<string> => {
  const ids = new Set<string>();

  if (!Array.isArray(value)) {
    return ids;
  }

  for (const row of value) {
    if (typeof row !== 'object' || row === null || !('lesson_id' in row)) {
      continue;
    }

    if (typeof row.lesson_id === 'string') {
      ids.add(row.lesson_id.trim().toLowerCase());
    }
  }

  return ids;
};

export const isCourseFullyCompleted = async (
  courseId: string,
  userId: string,
): Promise<boolean> => {
  const [publishedLessons, completedLessons] = await Promise.all([
    getPublishedLessonsByCourse(courseId),
    supabase
      .from('user_completed_lessons')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('course_id', courseId),
  ]);

  if (completedLessons.error) {
    throw new Error(completedLessons.error.message);
  }

  if (publishedLessons.length === 0) {
    return false;
  }

  const completedIds = readCompletedLessonIds(completedLessons.data);

  return publishedLessons.every((lesson) => completedIds.has(lesson.id.trim().toLowerCase()));
};
