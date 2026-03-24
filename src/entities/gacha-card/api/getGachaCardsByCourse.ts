import { supabase } from '@/shared/api/supabase/client';
import type { GachaCard } from '@/entities/gacha-card/model/types';

export const getGachaCardsByCourse = async (courseId: string): Promise<GachaCard[]> => {
  const { data, error } = await supabase
    .from('gacha_cards')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
};
