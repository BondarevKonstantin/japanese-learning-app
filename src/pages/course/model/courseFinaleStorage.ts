const storageKey = (userId: string, courseId: string): string => {
  return `course-finale-completed:${userId}:${courseId}`;
};

export const isCourseFinaleCompleted = (userId: string, courseId: string): boolean => {
  try {
    return localStorage.getItem(storageKey(userId, courseId)) === '1';
  } catch {
    return false;
  }
};

export const markCourseFinaleCompleted = (userId: string, courseId: string): void => {
  try {
    localStorage.setItem(storageKey(userId, courseId), '1');
  } catch {
    // The lesson and course pages stay available when the browser blocks storage.
  }
};
