import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/entities/user/model/types';

export type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  profileError: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
