import { useState, type PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/auth/useAuth';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';

type AppLayoutProps = PropsWithChildren<{
  disableOverflowHidden?: boolean;
}>;

export const AppLayout = ({ children, disableOverflowHidden = false }: AppLayoutProps) => {
  const { isAuthenticated, profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isTeacher = profile?.role === 'teacher';

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navLinkClassName =
    'flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  return (
    <div
      className={`h-screen overflow-x-hidden bg-background text-text-primary ${
        disableOverflowHidden ? '' : 'overflow-y-hidden'
      }`}
    >
      <div className="pointer-events-none fixed inset-0 z-0 opacity-40">
        <div className="absolute -left-[100px] -top-[100px] h-72 w-72 rounded-full bg-secondary blur-3xl" />
        <div className="absolute -right-[120px] -bottom-[120px] h-80 w-80 rounded-full bg-primary-light blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="h-1 w-full shrink-0 bg-primary" />

        {isAuthenticated ? (
          <header className="shrink-0 border-b border-border bg-surface/95 shadow-sm backdrop-blur">
            <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
              <Link
                to={routes.courses}
                onClick={closeMobileMenu}
                className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  aria-hidden="true"
                  className="h-9 w-9 shrink-0 rounded-lg border border-primary/40 bg-primary-light"
                />
                <span className="truncate text-base font-semibold text-text-primary sm:text-lg">
                  Gachahon
                </span>
              </Link>

              <nav aria-label="Основная навигация" className="ml-auto hidden items-center gap-2 md:flex">
                <Link to={routes.courses} className={navLinkClassName}>
                  Курсы
                </Link>

                {isTeacher ? (
                  <Link to={routes.teacherCourses} className={navLinkClassName}>
                    Учительская панель
                  </Link>
                ) : null}

                <LogoutButton label="Выход" />
              </nav>

              <button
                type="button"
                aria-expanded={isMobileMenuOpen}
                aria-controls="app-mobile-navigation"
                aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
                onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
                className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-text-primary transition active:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
              >
                {isMobileMenuOpen ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                )}
              </button>
            </div>

            {isMobileMenuOpen ? (
              <nav
                id="app-mobile-navigation"
                aria-label="Мобильная навигация"
                className="mx-auto grid w-full max-w-6xl gap-1 border-t border-border px-4 py-3 sm:px-6 md:hidden"
              >
                <Link
                  to={routes.courses}
                  onClick={closeMobileMenu}
                  className={navLinkClassName}
                >
                  Курсы
                </Link>

                {isTeacher ? (
                  <Link
                    to={routes.teacherCourses}
                    onClick={closeMobileMenu}
                    className={navLinkClassName}
                  >
                    Учительская панель
                  </Link>
                ) : null}

                <LogoutButton
                  label="Выход"
                  className="mt-1 min-h-11 w-full justify-start rounded-xl px-4"
                />
              </nav>
            ) : null}
          </header>
        ) : null}

        <div className="min-h-0 flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto h-full min-h-0 max-w-6xl">{children}</div>
        </div>
      </div>
    </div>
  );
};
