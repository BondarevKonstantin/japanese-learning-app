import { supabase } from '@/shared/api/supabase/client';
import type { Lesson } from '@/entities/lesson/model/types';

export const getPublishedLessonById = async (lessonId: string): Promise<Lesson> => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .eq('status', 'published')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
