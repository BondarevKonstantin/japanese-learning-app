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

type UpdateLessonPracticeItemParams = {
  itemId: string;
  type: LessonPracticeItemType;
  question: string;
  options: string[] | null;
  correctAnswer: string | string[];
  explanation: string;
  imageUrl: string | null;
  imageBlock: TheoryMediaBlock | null;
};

export const updateLessonPracticeItem = async ({
  itemId,
  type,
  question,
  options,
  correctAnswer,
  explanation,
  imageUrl,
  imageBlock,
}: UpdateLessonPracticeItemParams): Promise<LessonPracticeItem> => {
  const imageBlockPayload = imageBlock ? normalizeTheoryMediaBlock(imageBlock) : null;
  if (imageBlockPayload) {
    const mediaError = getTheoryMediaBlockError(imageBlockPayload);
    if (mediaError) {
      throw new Error(mediaError);
    }
  }

  const { data, error } = await supabase
    .from('lesson_practice_items')
    .update({
      type,
      question,
      options,
      correct_answer: correctAnswer,
      explanation: explanation.trim() || null,
      image_url: imageUrl,
      image_block: imageBlockPayload,
    })
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapLessonPracticeItem(data);
};
