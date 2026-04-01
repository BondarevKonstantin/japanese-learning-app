import { supabase } from '@/shared/api/supabase/client';
import type { Course, CourseStatus } from '@/entities/course/model/types';

type UpdateCourseStatusParams = {
  courseId: string;
  status: CourseStatus;
};

export const updateCourseStatus = async ({
  courseId,
  status,
}: UpdateCourseStatusParams): Promise<Course> => {
  const { data, error } = await supabase
    .from('courses')
    .update({
      status,
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
