import { supabase } from '@/shared/api/supabase/client';

export const getFinalizedGachaCourseIds = async (courseIds: string[]): Promise<string[]> => {
  if (courseIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('course_gacha_configs')
    .select('course_id')
    .in('course_id', courseIds)
    .eq('status', 'finalized');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((config) => config.course_id);
};
