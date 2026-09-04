import { useState } from 'react';
import { signOut } from '@/features/auth-by-email/api/signOut';
import { cn } from '@/shared/lib/cn';

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export const LogoutButton = ({ className, label = 'Выйти' }: LogoutButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogout = async () => {
    try {
      setErrorMessage('');
      setIsLoading(true);
      await signOut();
    } catch (error) {
      console.error('Logout failed', error);
      setErrorMessage('Не удалось выйти. Попробуйте ещё раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className={cn(
          'inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
      >
        {isLoading ? 'Выход...' : label}
      </button>

      {errorMessage ? (
        <p role="alert" className="max-w-52 text-xs text-accent">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
