import type { CourseGachaConfig } from '@/entities/gacha/model/types';
import { supabase } from '@/shared/api/supabase/client';

export const getCourseGachaConfig = async (
  courseId: string,
): Promise<CourseGachaConfig | null> => {
  const { data, error } = await supabase
    .from('course_gacha_configs')
    .select('*')
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
