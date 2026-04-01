import { supabase } from '@/shared/api/supabase/client';
import type {
  LessonPracticeItem,
  LessonPracticeItemType,
} from '@/entities/lesson-practice/model/types';

type UpdateLessonPracticeItemParams = {
  itemId: string;
  type: LessonPracticeItemType;
  question: string;
  options: string[] | null;
  correctAnswer: string | string[];
  explanation: string;
};

export const updateLessonPracticeItem = async ({
  itemId,
  type,
  question,
  options,
  correctAnswer,
  explanation,
}: UpdateLessonPracticeItemParams): Promise<LessonPracticeItem> => {
  const { data, error } = await supabase
    .from('lesson_practice_items')
    .update({
      type,
      question,
      options,
      correct_answer: correctAnswer,
      explanation: explanation.trim() || null,
    })
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as LessonPracticeItem;
};
