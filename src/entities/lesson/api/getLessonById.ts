import { supabase } from '@/shared/api/supabase/client';
import type { Lesson } from '@/entities/lesson/model/types';

export const getLessonById = async (lessonId: string): Promise<Lesson> => {
  const { data, error } = await supabase.from('lessons').select('*').eq('id', lessonId).single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Lesson;
};
