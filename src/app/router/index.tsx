import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/pages/home/ui/HomePage';
import { NotFoundPage } from '@/pages/not-found/ui/NotFoundPage';
import { RegisterPage } from '@/pages/auth/register/ui/RegisterPage';
import { LoginPage } from '@/pages/auth/login/ui/LoginPage';
import { TeacherCoursesPage } from '@/pages/teacher/courses/ui/TeacherCoursesPage';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { TeacherRoute } from '@/app/router/TeacherRoute';
import { routes } from '@/shared/config/routes';
import { TeacherGachaCardsPage } from '@/pages/teacher/gacha-cards/ui/TeacherGachaCardsPage';
import { GachaPage } from '@/pages/gacha/ui/GachaPage';
import { GachaCollectionPage } from '@/pages/gacha-collection/ui/GachaCollectionPage';
import { CreateCoursePage } from '@/pages/teacher/create-course/ui/CreateCoursePage';

import { TeacherCourseLessonsPage } from '@/pages/teacher/course-lessons/ui/TeacherCourseLessonsPage';
import { CreateLessonPage } from '@/pages/teacher/create-lesson/ui/CreateLessonPage';

export const router = createBrowserRouter([
  {
    path: routes.home,
    element: <HomePage />,
  },
  {
    path: routes.register,
    element: <RegisterPage />,
  },
  {
    path: routes.login,
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <TeacherRoute />,
        children: [
          {
            path: routes.teacherCourses,
            element: <TeacherCoursesPage />,
          },
          {
            path: routes.teacherCreateCourse,
            element: <CreateCoursePage />,
          },
          {
            path: routes.teacherCourseLessons,
            element: <TeacherCourseLessonsPage />,
          },
          {
            path: routes.teacherCreateLesson,
            element: <CreateLessonPage />,
          },
          {
            path: routes.teacherGachaCards,
            element: <TeacherGachaCardsPage />,
          },
        ],
      },
      {
        path: routes.courseGacha,
        element: <GachaPage />,
      },
      {
        path: routes.courseCollection,
        element: <GachaCollectionPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
