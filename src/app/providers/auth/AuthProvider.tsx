import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';
import { getProfile } from '@/entities/user/api/getProfile';
import type { Profile } from '@/entities/user/model/types';
import { supabase } from '@/shared/api/supabase/client';
import { AuthContext, type AuthContextValue } from './AuthContext';

type ProfileState = {
  userId: string;
  profile: Profile | null;
  error: string | null;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const currentUserIdRef = useRef<string | null>(null);

  const refreshProfile = useCallback(() => {
    if (!user) {
      return;
    }

    setProfileState(null);
    setProfileRefreshKey((currentKey) => currentKey + 1);
  }, [user]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;

      if (currentUserIdRef.current !== nextUserId) {
        currentUserIdRef.current = nextUserId;
        setProfileState(null);
      }

      setUser(nextUser);
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = user?.id;

    if (!userId) {
      return;
    }

    let shouldIgnoreResult = false;

    const loadProfile = async () => {
      try {
        const nextProfile = await getProfile(userId);

        if (shouldIgnoreResult) {
          return;
        }

        setProfileState({
          userId,
          profile: nextProfile,
          error: nextProfile ? null : 'Профиль пользователя не найден.',
        });
      } catch (error) {
        console.error('Failed to load profile', error);

        if (shouldIgnoreResult) {
          return;
        }

        setProfileState({
          userId,
          profile: null,
          error: 'Не удалось загрузить профиль.',
        });
      }
    };

    void loadProfile();

    return () => {
      shouldIgnoreResult = true;
    };
  }, [profileRefreshKey, user?.id]);

  const currentProfileState =
    user && profileState?.userId === user.id ? profileState : null;
  const profile = currentProfileState?.profile ?? null;
  const profileError = currentProfileState?.error ?? null;
  const isLoading = isAuthLoading || Boolean(user && profileState?.userId !== user.id);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      profileError,
      isLoading,
      isAuthenticated: Boolean(user),
      refreshProfile,
    }),
    [user, profile, profileError, isLoading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
