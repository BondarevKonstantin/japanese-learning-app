import { supabase } from '@/shared/api/supabase/client';
import type { Course } from '@/entities/course/model/types';

type UpdateCourseParams = {
  courseId: string;
  title: string;
  description: string;
};

export const updateCourse = async ({
  courseId,
  title,
  description,
}: UpdateCourseParams): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .update({
      title,
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
