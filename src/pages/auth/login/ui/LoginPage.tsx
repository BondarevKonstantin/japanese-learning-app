import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AppLayout } from '@/app/layouts/AppLayout';
import { signIn } from '@/features/auth-by-email/api/signIn';
import { getAuthErrorMessage } from '@/features/auth-by-email/lib/getAuthErrorMessage';
import { routes } from '@/shared/config/routes';

const getLoginRedirectPath = (state: unknown) => {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return routes.courses;
  }

  const from = state.from;

  if (typeof from !== 'object' || from === null || !('pathname' in from)) {
    return routes.courses;
  }

  const pathname = from.pathname;

  if (
    typeof pathname !== 'string' ||
    !pathname.startsWith('/') ||
    pathname.startsWith('//')
  ) {
    return routes.courses;
  }

  const search =
    'search' in from &&
    typeof from.search === 'string' &&
    (from.search === '' || from.search.startsWith('?'))
      ? from.search
      : '';
  const hash =
    'hash' in from &&
    typeof from.hash === 'string' &&
    (from.hash === '' || from.hash.startsWith('#'))
      ? from.hash
      : '';

  return `${pathname}${search}${hash}`;
};

export const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');
    setIsLoading(true);

    try {
      await signIn({
        email,
        password,
      });

      navigate(getLoginRedirectPath(location.state), { replace: true });
    } catch (error) {
      console.error('Login failed', error);
      setErrorMessage(getAuthErrorMessage(error, 'login'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-medium text-accent">Japanese Learning</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">Вход</h1>
          <p className="mt-2 text-sm text-text-secondary">Тестовая страница входа пользователя</p>
        </div>

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
              placeholder="email@example.com"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
              placeholder="Введите пароль"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-5 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
            {errorMessage}
          </p>
        ) : null}

      </div>
    </AppLayout>
  );
};
