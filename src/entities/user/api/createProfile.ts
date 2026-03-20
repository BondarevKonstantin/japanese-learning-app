import { supabase } from '@/shared/api/supabase/client';

type CreateProfileParams = {
  id: string;
  email: string;
  displayName?: string | null;
  role?: 'teacher' | 'student';
};

export const createProfile = async ({
  id,
  email,
  displayName = null,
  role = 'student',
}: CreateProfileParams) => {
  const { error } = await supabase.from('profiles').insert({
    id,
    email,
    role,
    display_name: displayName,
  });

  if (error) {
    throw error;
  }
};
