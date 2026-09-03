import { supabase } from '@/shared/api/supabase/client';

type SubmitLessonAnswerPayload = {
  practiceItemId: string;
  answerText: string;
};

type SubmitLessonAnswersParams = {
  lessonId: string;
  answers: SubmitLessonAnswerPayload[];
};

export const submitLessonAnswers = async ({
  lessonId,
  answers,
}: SubmitLessonAnswersParams): Promise<string> => {
  if (answers.some((answer) => !answer.answerText.trim())) {
    throw new Error('Перед отправкой нужно заполнить все задания.');
  }

  const { data, error } = await supabase.rpc('submit_lesson_answers', {
    p_lesson_id: lessonId,
    p_answers: answers.map((item) => ({
      practiceItemId: item.practiceItemId,
      answerText: item.answerText,
    })),
  });

  if (error) {
    throw error;
  }

  return data as string;
};
