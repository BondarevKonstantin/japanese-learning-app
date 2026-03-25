export const routes = {
  home: '/',
  register: '/register',
  login: '/login',

  teacherCourses: '/teacher/courses',
  teacherCreateCourse: '/teacher/courses/create',
  teacherCourseLessons: '/teacher/courses/:courseId/lessons',
  teacherCreateLesson: '/teacher/courses/:courseId/lessons/create',
  teacherGachaCards: '/teacher/courses/:courseId/gacha/cards',

  courseGacha: '/courses/:courseId/gacha',
  courseCollection: '/courses/:courseId/collection',
} as const;
