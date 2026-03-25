import { supabase } from '@/shared/api/supabase/client';
import type { Course } from '@/entities/course/model/types';

export const getCoursesByTeacher = async (teacherId: string): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};
