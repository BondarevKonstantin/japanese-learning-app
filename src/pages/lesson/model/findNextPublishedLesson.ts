import type { Lesson } from '@/entities/lesson/model/types';

const normalizeId = (value: string): string => value.trim().toLowerCase();

export type NextPublishedLessonResolution =
  | { status: 'ready'; nextLesson: Lesson | null }
  | { status: 'missing' };

export const findNextPublishedLesson = (
  lessons: readonly Lesson[],
  courseId: string,
  lessonId: string,
): NextPublishedLessonResolution => {
  const courseKey = normalizeId(courseId);
  const lessonKey = normalizeId(lessonId);
  const currentIndex = lessons.findIndex(
    (lesson) => normalizeId(lesson.id) === lessonKey && normalizeId(lesson.course_id) === courseKey,
  );

  if (currentIndex < 0) {
    return { status: 'missing' };
  }

  const nextLesson = lessons[currentIndex + 1];

  if (!nextLesson) {
    return { status: 'ready', nextLesson: null };
  }

  if (
    normalizeId(nextLesson.id) === lessonKey ||
    normalizeId(nextLesson.course_id) !== courseKey ||
    nextLesson.status !== 'published'
  ) {
    return { status: 'missing' };
  }

  return { status: 'ready', nextLesson };
};
