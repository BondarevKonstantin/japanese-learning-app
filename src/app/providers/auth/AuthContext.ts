import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/entities/user/model/types';

export type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
