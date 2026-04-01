import { supabase } from '@/shared/api/supabase/client';
import type { Lesson } from '@/entities/lesson/model/types';

type UpdateLessonParams = {
  lessonId: string;
  title: string;
  description: string;
  theoryMarkdown: string;
};

export const updateLesson = async ({
  lessonId,
  title,
  description,
  theoryMarkdown,
}: UpdateLessonParams): Promise<Lesson> => {
  const { data, error } = await supabase
    .from('lessons')
    .update({
      title,
      description: description.trim() || null,
      theory_markdown: theoryMarkdown,
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
