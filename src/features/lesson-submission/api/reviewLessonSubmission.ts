import { supabase } from '@/shared/api/supabase/client';

type ReviewLessonSubmissionAnswerPayload = {
  answerId: string;
  teacherComment: string;
};

type ReviewLessonSubmissionParams = {
  submissionId: string;
  answers: ReviewLessonSubmissionAnswerPayload[];
};

export const reviewLessonSubmission = async ({
  submissionId,
  answers,
}: ReviewLessonSubmissionParams): Promise<void> => {
  const { data: submission, error: submissionError } = await supabase
    .from('lesson_submissions')
    .select('status')
    .eq('id', submissionId)
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new Error('Работа не найдена');
  }

  if (submission.status === 'reviewed') {
    throw new Error('Эта работа уже проверена. Повторная отправка результата недоступна.');
  }

  const { error } = await supabase.rpc('review_lesson_submission', {
    p_submission_id: submissionId,
    p_answers: answers.map((item) => ({
      answerId: item.answerId,
      teacherComment: item.teacherComment,
    })),
  });

  if (error) {
    throw error;
  }
};
