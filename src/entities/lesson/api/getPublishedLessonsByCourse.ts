import { supabase } from '@/shared/api/supabase/client';
import type { Lesson } from '@/entities/lesson/model/types';

export const getPublishedLessonsByCourse = async (courseId: string): Promise<Lesson[]> => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .eq('status', 'published')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};
