import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';
import { getProfile } from '@/entities/user/api/getProfile';
import type { Profile } from '@/entities/user/model/types';
import { supabase } from '@/shared/api/supabase/client';
import { AuthContext, type AuthContextValue } from './AuthContext';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    const nextProfile = await getProfile(nextUser.id);
    setProfile(nextProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const nextProfile = await getProfile(user.id);
    setProfile(nextProfile);
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const sessionUser = session?.user ?? null;

        if (!isMounted) {
          return;
        }

        setUser(sessionUser);

        if (sessionUser) {
          const nextProfile = await getProfile(sessionUser.id);

          if (!isMounted) {
            return;
          }

          setProfile(nextProfile);
        } else {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      void loadProfile(nextUser);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: Boolean(user),
      refreshProfile,
    }),
    [user, profile, isLoading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
