import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/app/providers/auth/useAuth';
import { routes } from '@/shared/config/routes';

export const PublicAuthRoute = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-primary">
        Загрузка...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={routes.courses} replace />;
  }

  return <Outlet />;
};
