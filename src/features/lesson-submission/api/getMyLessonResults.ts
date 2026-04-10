import { supabase } from '@/shared/api/supabase/client';
import type { LessonResultItem } from '@/entities/lesson-submission/model/types';

export const getMyLessonResults = async (lessonId: string): Promise<LessonResultItem[]> => {
  const { data, error } = await supabase.rpc('get_my_lesson_results', {
    p_lesson_id: lessonId,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as LessonResultItem[];
};
