import { supabase } from '@/shared/api/supabase/client';
import type { Lesson } from '@/entities/lesson/model/types';

type CreateLessonParams = {
  courseId: string;
  title: string;
  description: string;
  theoryMarkdown: string;
};

export const createLesson = async ({
  courseId,
  title,
  description,
  theoryMarkdown,
}: CreateLessonParams): Promise<Lesson> => {
  const { data: lessons, error: orderError } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('course_id', courseId)
    .order('order_index', { ascending: false })
    .limit(1);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const nextOrderIndex = lessons?.[0]?.order_index != null ? lessons[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      course_id: courseId,
      title,
      description: description.trim() || null,
      theory_markdown: theoryMarkdown,
      status: 'draft',
      order_index: nextOrderIndex,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
