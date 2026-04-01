export const routes = {
  home: '/',
  register: '/register',
  login: '/login',

  teacherCourses: '/teacher/courses',
  teacherCreateCourse: '/teacher/courses/create',
  teacherEditCourse: '/teacher/courses/:courseId/edit',

  teacherCourseLessons: '/teacher/courses/:courseId/lessons',
  teacherCreateLesson: '/teacher/courses/:courseId/lessons/create',
  teacherEditLesson: '/teacher/courses/:courseId/lessons/:lessonId/edit',
  teacherLessonPractice: '/teacher/courses/:courseId/lessons/:lessonId/practice',

  teacherGachaCards: '/teacher/courses/:courseId/gacha/cards',

  courses: '/courses',
  course: '/courses/:courseId',
  lesson: '/courses/:courseId/lessons/:lessonId',

  courseGacha: '/courses/:courseId/gacha',
  courseCollection: '/courses/:courseId/collection',
} as const;
