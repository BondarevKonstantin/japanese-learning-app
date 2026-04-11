import { Link } from 'react-router';
import { useAuth } from '@/app/providers/auth/useAuth';
import { routes } from '@/shared/config/routes';

export const HomePage = () => {
  const { user, profile, isLoading } = useAuth();

  return (
    <div className="relative h-screen flex min-h-[90vh] items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 -z-10">
        <img src="main-bg.png" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />

        <div className="absolute inset-0 from-background/70 via-background/60 to-background" />
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Gachahon</h1>

        <p className="mt-4 max-w-2xl text-base text-text-secondary sm:text-lg">
          Изучай японский - крути がちゃはんばいき. Получай карточки за прогресс и собери всю
          коллекцию!
        </p>

        <div className="mt-10 w-full max-w-3xl rounded-[32px] border border-white/40 bg-white/45 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to={routes.register}
              className="group flex items-center justify-between rounded-[24px] border border-primary/30 bg-primary/90 px-5 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_20px_rgba(131,143,88,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-primary"
            >
              <span className="text-base font-semibold">Регистрация</span>
              <span className="text-xl transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              to={routes.login}
              className="group flex items-center justify-between rounded-[24px] border border-black/5 bg-white/70 px-5 py-4 text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_18px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/85"
            >
              <span className="text-base font-semibold">Вход</span>
              <span className="text-xl text-text-secondary transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              to={routes.teacherCourses}
              className="group flex items-center justify-between rounded-[24px] border border-black/5 bg-white/70 px-5 py-4 text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_18px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/85"
            >
              <span className="text-base font-semibold">Teacher Courses</span>
              <span className="text-xl text-text-secondary transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              to={routes.courses}
              className="group flex items-center justify-between rounded-[24px] border border-black/5 bg-white/70 px-5 py-4 text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_18px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/85"
            >
              <span className="text-base font-semibold">Student Courses</span>
              <span className="text-xl text-text-secondary transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>

        {(user || profile) && (
          <div className="mt-8 w-full max-w-2xl rounded-2xl border border-border bg-surface/50 p-4 text-left text-xs text-text-secondary backdrop-blur">
            <p>
              <strong>Loading:</strong> {String(isLoading)}
            </p>
            <p>
              <strong>Email:</strong> {user?.email ?? '—'}
            </p>
            <p>
              <strong>Role:</strong> {profile?.role ?? '—'}
            </p>
            <p>
              <strong>Name:</strong> {profile?.display_name ?? '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
