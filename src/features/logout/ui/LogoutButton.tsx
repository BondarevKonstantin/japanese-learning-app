import { useState } from 'react';
import { signOut } from '@/features/auth-by-email/api/signOut';

export const LogoutButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? 'Выход...' : 'Выйти'}
    </button>
  );
};
