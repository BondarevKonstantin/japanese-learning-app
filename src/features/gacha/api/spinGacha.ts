import { supabase } from '@/shared/api/supabase/client';
import type { SpinGachaResult } from '@/entities/gacha/model/types';

export async function spinGacha(courseId: string): Promise<SpinGachaResult> {
  const { data, error } = await supabase.rpc('spin_gacha', {
    p_course_id: courseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as SpinGachaResult;
}
