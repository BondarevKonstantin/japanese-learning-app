import { mapLessonPracticeItem } from '@/entities/lesson-practice/lib/mapLessonPracticeItem';
import type { LessonPracticeItem } from '@/entities/lesson-practice/model/types';
import { supabase } from '@/shared/api/supabase/client';

export const getLessonPracticeItems = async (lessonId: string): Promise<LessonPracticeItem[]> => {
  const { data, error } = await supabase
    .from('lesson_practice_items')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapLessonPracticeItem(row));
};
