const storageKey = (userId: string, courseId: string): string => {
  return `course-intro-completed:${userId}:${courseId}`;
};

export const isCourseIntroCompleted = (userId: string, courseId: string): boolean => {
  try {
    return localStorage.getItem(storageKey(userId, courseId)) === '1';
  } catch {
    return false;
  }
};

export const markCourseIntroCompleted = (userId: string, courseId: string): void => {
  try {
    localStorage.setItem(storageKey(userId, courseId), '1');
  } catch {
    // The course page stays available when the browser blocks storage.
  }
};
