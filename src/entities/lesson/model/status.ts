import type { LessonStatus } from '@/entities/lesson/model/types';

export const lessonStatusLabelMap: Record<LessonStatus, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
};

export const lessonStatusClassMap: Record<LessonStatus, string> = {
  draft: 'border-border bg-background text-text-primary',
  published: 'border-primary bg-primary-light text-text-primary',
  archived: 'border-accent bg-secondary text-accent',
};
