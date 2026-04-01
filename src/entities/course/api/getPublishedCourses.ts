import { supabase } from '@/shared/api/supabase/client';
import type { Course } from '@/entities/course/model/types';

export const getPublishedCourses = async (): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};
