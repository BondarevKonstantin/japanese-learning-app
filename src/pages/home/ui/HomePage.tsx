import { Link } from 'react-router';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import { routes } from '@/shared/config/routes';

export const HomePage = () => {
  const { user, profile, isLoading } = useAuth();

  return (
    <AppLayout>
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Japanese Learning App</h1>

        <p className="mt-4 max-w-2xl text-base text-text-secondary sm:text-lg">
          Фундамент проекта готов. Сейчас можно тестировать регистрацию, вход и роли.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={routes.register}
            className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90"
          >
            Регистрация
          </Link>

          <Link
            to={routes.login}
            className="rounded-2xl border border-border bg-surface px-5 py-3 font-medium text-text-primary transition hover:bg-background"
          >
            Вход
          </Link>

          <Link
            to={routes.teacherCourses}
            className="rounded-2xl border border-border bg-surface px-5 py-3 font-medium text-text-primary transition hover:bg-background"
          >
            Teacher Courses
          </Link>
        </div>

        <div className="mt-8 w-full max-w-2xl rounded-2xl border border-border bg-surface p-4 text-left text-sm">
          <p>
            <strong>Loading:</strong> {String(isLoading)}
          </p>
          <p>
            <strong>User email:</strong> {user?.email ?? '—'}
          </p>
          <p>
            <strong>Role:</strong> {profile?.role ?? '—'}
          </p>
          <p>
            <strong>Display name:</strong> {profile?.display_name ?? '—'}
          </p>
        </div>
      </div>
    </AppLayout>
  );
};
