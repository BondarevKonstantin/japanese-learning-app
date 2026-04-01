import { supabase } from '@/shared/api/supabase/client';
import type {
  LessonPracticeItem,
  LessonPracticeItemType,
} from '@/entities/lesson-practice/model/types';

type CreateLessonPracticeItemParams = {
  lessonId: string;
  type: LessonPracticeItemType;
  question: string;
  options: string[] | null;
  correctAnswer: string | string[];
  explanation: string;
};

export const createLessonPracticeItem = async ({
  lessonId,
  type,
  question,
  options,
  correctAnswer,
  explanation,
}: CreateLessonPracticeItemParams): Promise<LessonPracticeItem> => {
  const { data: items, error: orderError } = await supabase
    .from('lesson_practice_items')
    .select('order_index')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: false })
    .limit(1);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const nextOrderIndex = items?.[0]?.order_index != null ? items[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from('lesson_practice_items')
    .insert({
      lesson_id: lessonId,
      type,
      question,
      options,
      correct_answer: correctAnswer,
      explanation: explanation.trim() || null,
      order_index: nextOrderIndex,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as LessonPracticeItem;
};
