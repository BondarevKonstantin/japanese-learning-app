import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/pages/home/ui/HomePage';
import { NotFoundPage } from '@/pages/not-found/ui/NotFoundPage';
import { RegisterPage } from '@/pages/auth/register/ui/RegisterPage';
import { LoginPage } from '@/pages/auth/login/ui/LoginPage';
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
    path: '*',
    element: <NotFoundPage />,
  },
]);
