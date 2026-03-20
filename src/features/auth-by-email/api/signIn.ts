import { supabase } from '@/shared/api/supabase/client';

type SignInParams = {
  email: string;
  password: string;
};

export const signIn = async ({ email, password }: SignInParams) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};
