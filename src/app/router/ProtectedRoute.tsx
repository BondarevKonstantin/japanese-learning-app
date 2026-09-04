import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/app/providers/auth/useAuth';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';

export const ProtectedRoute = () => {
  const { isLoading, isAuthenticated, profile, profileError, refreshProfile } = useAuth();
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

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-text-primary">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 text-center shadow-sm">
          <p>{profileError ?? 'Профиль пользователя недоступен.'}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={refreshProfile}
              className="min-h-11 rounded-2xl bg-primary px-4 py-2 font-medium text-white"
            >
              Повторить
            </button>
            <LogoutButton />
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
