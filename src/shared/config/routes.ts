export const routes = {
  home: '/',
  register: '/register',
  login: '/login',

  teacherCourses: '/teacher/courses',
  teacherGachaCards: '/teacher/courses/:courseId/gacha/cards',

  courseGacha: '/courses/:courseId/gacha',
  courseCollection: '/courses/:courseId/collection',
} as const;
