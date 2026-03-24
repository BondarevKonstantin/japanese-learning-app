import { supabase } from '@/shared/api/supabase/client';
import type { UserCourseGachaStateDto } from '@/entities/gacha/model/types';

export async function addTestPulls(
  courseId: string,
  amount = 10,
): Promise<UserCourseGachaStateDto> {
  const { data, error } = await supabase.rpc('add_test_pulls', {
    p_course_id: courseId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as UserCourseGachaStateDto;
}
