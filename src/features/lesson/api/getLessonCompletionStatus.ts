import { supabase } from '@/shared/api/supabase/client';

export type LessonCompletionStatus = {
  isCompleted: boolean;
};

export const getLessonCompletionStatus = async (
  lessonId: string,
  userId: string,
): Promise<LessonCompletionStatus> => {
  const { data, error } = await supabase
    .from('user_completed_lessons')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    isCompleted: !!data,
  };
};
