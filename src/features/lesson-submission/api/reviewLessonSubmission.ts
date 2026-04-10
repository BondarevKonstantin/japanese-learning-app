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
