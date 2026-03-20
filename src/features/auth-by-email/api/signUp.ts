import { supabase } from '@/shared/api/supabase/client';

type SignUpParams = {
  email: string;
  password: string;
  displayName?: string;
};

export const signUp = async ({ email, password, displayName }: SignUpParams) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName ?? null,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
};
