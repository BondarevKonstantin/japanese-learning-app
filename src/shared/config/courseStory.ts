const COURSE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const parseCourseStoryIds = (value: string | undefined): ReadonlySet<string> => {
  if (!value?.trim()) {
    return new Set();
  }

  const ids = new Set<string>();

  for (const part of value.split(',')) {
    const id = part.trim().toLowerCase();

    if (COURSE_ID_PATTERN.test(id)) {
      ids.add(id);
    }
  }

  return ids;
};

export const courseStoryIds = parseCourseStoryIds(import.meta.env.VITE_COURSE_STORY_IDS);

export const isCourseStoryEnabled = (courseId: string): boolean => {
  return courseStoryIds.has(courseId.trim().toLowerCase());
};

export const COURSE_STORY_SLIDES = [
  { src: '/assets/course-story/intro-1.png', alt: 'Вступление к курсу, слайд 1' },
  { src: '/assets/course-story/intro-2.png', alt: 'Вступление к курсу, слайд 2' },
  { src: '/assets/course-story/intro-3.png', alt: 'Вступление к курсу, слайд 3' },
  { src: '/assets/course-story/intro-4.png', alt: 'Вступление к курсу, слайд 4' },
] as const;

export const COURSE_FINALE_IMAGE = {
  src: '/assets/course-story/finale.png',
  alt: 'Поздравление с завершением курса',
} as const;
