import { parseCourseGiftState } from '@/entities/course-gift/api/parseCourseGiftState';
import type { CourseGiftState } from '@/entities/course-gift/model/types';
import { supabase } from '@/shared/api/supabase/client';

export const getMyCourseGift = async (courseId: string): Promise<CourseGiftState> => {
  const normalizedCourseId = courseId.trim();

  if (!normalizedCourseId) {
    throw new Error('Курс не найден.');
  }

  const { data, error } = await supabase.rpc('get_my_course_gift', {
    p_course_id: normalizedCourseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return parseCourseGiftState(data);
};
