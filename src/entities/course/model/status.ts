import type { CourseStatus } from '@/entities/course/model/types';

export const courseStatusLabelMap: Record<CourseStatus, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
};

export const courseStatusClassMap: Record<CourseStatus, string> = {
  draft: 'border-border bg-background text-text-primary',
  published: 'border-primary bg-primary-light text-text-primary',
  archived: 'border-accent bg-secondary text-accent',
};
