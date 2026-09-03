import { supabase } from '@/shared/api/supabase/client';
import type {
  LessonSubmission,
  LessonSubmissionAnswer,
  MyLessonSubmissionDetails,
} from '@/entities/lesson-submission/model/types';

export const getMyLessonSubmission = async (
  lessonId: string,
): Promise<MyLessonSubmissionDetails | null> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error('Пользователь не авторизован');
  }

  const { data: submission, error: submissionError } = await supabase
    .from('lesson_submissions')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    return null;
  }

  const { data: answers, error: answersError } = await supabase
    .from('lesson_submission_answers')
    .select('*')
    .eq('submission_id', submission.id);

  if (answersError) {
    throw answersError;
  }

  return {
    submission: submission as LessonSubmission,
    answers: (answers ?? []) as LessonSubmissionAnswer[],
  };
};
