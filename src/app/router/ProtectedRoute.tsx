import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/app/providers/auth/useAuth';
import { routes } from '@/shared/config/routes';

export const ProtectedRoute = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-primary">
        Загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
};
