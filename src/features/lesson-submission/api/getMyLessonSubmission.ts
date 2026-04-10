import { supabase } from '@/shared/api/supabase/client';
import type { LessonSubmission } from '@/entities/lesson-submission/model/types';

export const getMyLessonSubmission = async (lessonId: string): Promise<LessonSubmission | null> => {
  const { data, error } = await supabase
    .from('lesson_submissions')
    .select('*')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LessonSubmission | null) ?? null;
};
