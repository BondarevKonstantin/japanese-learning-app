import type { CourseGachaConfig } from '@/entities/gacha/model/types';
import { supabase } from '@/shared/api/supabase/client';

export const finalizeCourseGacha = async (courseId: string): Promise<CourseGachaConfig> => {
  const { data, error } = await supabase.rpc('finalize_course_gacha', {
    p_course_id: courseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as CourseGachaConfig;
};
