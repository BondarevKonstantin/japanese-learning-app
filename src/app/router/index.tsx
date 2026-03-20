import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/pages/home/ui/HomePage';
import { NotFoundPage } from '@/pages/not-found/ui/NotFoundPage';
import { RegisterPage } from '@/pages/auth/register/ui/RegisterPage';
import { LoginPage } from '@/pages/auth/login/ui/LoginPage';
import { TeacherCoursesPage } from '@/pages/teacher/courses/ui/TeacherCoursesPage';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { TeacherRoute } from '@/app/router/TeacherRoute';
import { routes } from '@/shared/config/routes';

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
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
