import { AppLayout } from '@/app/layouts/AppLayout';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { useAuth } from '@/app/providers/auth/useAuth';

export const TeacherCoursesPage = () => {
  const { profile, user } = useAuth();

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Курсы</h1>
            <p className="mt-2 text-text-secondary">Тестовая страница teacher-раздела</p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <p>
            <strong>Email:</strong> {user?.email ?? '—'}
          </p>
          <p className="mt-2">
            <strong>Role:</strong> {profile?.role ?? '—'}
          </p>
          <p className="mt-2">
            <strong>Name:</strong> {profile?.display_name ?? '—'}
          </p>
        </div>
      </div>
    </AppLayout>
  );
};
