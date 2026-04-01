import { supabase } from '@/shared/api/supabase/client';
import type { Course } from '@/entities/course/model/types';

export const getPublishedCourseById = async (courseId: string): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('status', 'published')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
