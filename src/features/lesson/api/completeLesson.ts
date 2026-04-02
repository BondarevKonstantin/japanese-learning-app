import { supabase } from '@/shared/api/supabase/client';

export type CompleteLessonResult = {
  completed_now: boolean;
  reward_amount: number;
  course_id: string;
  lesson_id: string;
  state: {
    available_pulls: number;
    used_pulls: number;
    total_pulls_earned: number;
  };
};

export const completeLesson = async (lessonId: string): Promise<CompleteLessonResult> => {
  const { data, error } = await supabase.rpc('complete_lesson', {
    p_lesson_id: lessonId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as CompleteLessonResult;
};
