import { supabase } from '@/shared/api/supabase/client';
import type { Lesson, LessonStatus } from '@/entities/lesson/model/types';

type UpdateLessonStatusParams = {
  lessonId: string;
  status: LessonStatus;
};

export const updateLessonStatus = async ({
  lessonId,
  status,
}: UpdateLessonStatusParams): Promise<Lesson> => {
  const { data, error } = await supabase
    .from('lessons')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lessonId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
