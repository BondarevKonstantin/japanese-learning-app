import { useState } from 'react';
import { AppLayout } from '@/app/layouts/AppLayout';
import { signIn } from '@/features/auth-by-email/api/signIn';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await signIn({
        email,
        password,
      });

      setSuccessMessage('Вход выполнен успешно');
      setPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить вход';

      setErrorMessage(message);
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

        {successMessage ? (
          <p className="mt-5 rounded-2xl border border-primary bg-primary-light px-4 py-3 text-sm text-text-primary">
            {successMessage}
          </p>
        ) : null}
      </div>
    </AppLayout>
  );
};
