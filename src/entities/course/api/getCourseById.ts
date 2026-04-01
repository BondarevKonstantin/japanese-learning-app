import { supabase } from '@/shared/api/supabase/client';
import type { Course } from '@/entities/course/model/types';

export const getCourseById = async (courseId: string): Promise<Course> => {
  const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
