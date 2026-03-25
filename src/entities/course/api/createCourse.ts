import { supabase } from '@/shared/api/supabase/client';
import type { Course } from '@/entities/course/model/types';

type CreateCourseParams = {
  title: string;
  description: string;
  createdBy: string;
};

export const createCourse = async ({
  title,
  description,
  createdBy,
}: CreateCourseParams): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      title,
      description: description.trim() || null,
      created_by: createdBy,
      status: 'draft',
      order_index: 0,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
