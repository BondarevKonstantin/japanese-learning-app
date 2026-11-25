import { mapLessonPracticeItem } from '@/entities/lesson-practice/lib/mapLessonPracticeItem';
import type {
  LessonPracticeItem,
  LessonPracticeItemType,
} from '@/entities/lesson-practice/model/types';
import { supabase } from '@/shared/api/supabase/client';
import {
  getTheoryMediaBlockError,
  normalizeTheoryMediaBlock,
  type TheoryMediaBlock,
} from '@/shared/lib/theoryMediaBlock';

type CreateLessonPracticeItemParams = {
  lessonId: string;
  type: LessonPracticeItemType;
  question: string;
  options: string[] | null;
  correctAnswer: string | string[];
  explanation: string;
  imageUrl: string | null;
  imageBlock: TheoryMediaBlock | null;
};

export const createLessonPracticeItem = async ({
  lessonId,
  type,
  question,
  options,
  correctAnswer,
  explanation,
  imageUrl,
  imageBlock,
}: CreateLessonPracticeItemParams): Promise<LessonPracticeItem> => {
  const imageBlockPayload = imageBlock ? normalizeTheoryMediaBlock(imageBlock) : null;
  if (imageBlockPayload) {
    const mediaError = getTheoryMediaBlockError(imageBlockPayload);
    if (mediaError) {
      throw new Error(mediaError);
    }
  }

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
      image_url: imageUrl,
      image_block: imageBlockPayload,
      order_index: nextOrderIndex,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapLessonPracticeItem(data);
};
