import { supabase } from '@/shared/api/supabase/client';
import type {
  LessonSubmission,
  TeacherLessonSubmissionDetails,
  TeacherLessonSubmissionReviewItem,
} from '@/entities/lesson-submission/model/types';
import { getProfile } from '@/entities/user/api/getProfile';

type PracticeItemRow = {
  id: string;
  type: 'multiple_choice' | 'input' | 'textarea';
  question: string;
  correct_answer: string | string[];
  explanation: string | null;
  image_url: string | null;
  order_index: number;
};

type SubmissionAnswerRow = {
  id: string;
  submission_id: string;
  practice_item_id: string;
  answer_text: string | null;
  is_auto_correct: boolean | null;
  teacher_comment: string | null;
  lesson_practice_items: PracticeItemRow | PracticeItemRow[] | null;
};

const getPracticeItemFromRelation = (
  relation: PracticeItemRow | PracticeItemRow[] | null,
): PracticeItemRow | null => {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
};

export const getLessonSubmissionById = async (
  submissionId: string,
): Promise<TeacherLessonSubmissionDetails> => {
  const { data: submission, error: submissionError } = await supabase
    .from('lesson_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new Error('Работа не найдена');
  }

  const [studentProfile, answersResult] = await Promise.all([
    getProfile(submission.user_id),
    supabase
      .from('lesson_submission_answers')
      .select(
        `
        id,
        submission_id,
        practice_item_id,
        answer_text,
        is_auto_correct,
        teacher_comment,
        lesson_practice_items (
          id,
          type,
          question,
          correct_answer,
          explanation,
          image_url,
          order_index
        )
      `,
      )
      .eq('submission_id', submissionId),
  ]);

  if (answersResult.error) {
    throw answersResult.error;
  }

  const normalizedRows = (answersResult.data ?? []) as unknown as SubmissionAnswerRow[];

  const answers: TeacherLessonSubmissionReviewItem[] = normalizedRows
    .map((row) => {
      const practiceItem = getPracticeItemFromRelation(row.lesson_practice_items);

      if (!practiceItem) {
        return null;
      }

      return {
        answer_id: row.id,
        submission_id: row.submission_id,
        practice_item_id: row.practice_item_id,
        answer_text: row.answer_text,
        is_auto_correct: row.is_auto_correct,
        teacher_comment: row.teacher_comment,
        practice_item_type: practiceItem.type,
        question: practiceItem.question,
        correct_answer: practiceItem.correct_answer,
        explanation: practiceItem.explanation,
        image_url: practiceItem.image_url,
        order_index: practiceItem.order_index,
      };
    })
    .filter((item): item is TeacherLessonSubmissionReviewItem => item !== null)
    .sort((a, b) => a.order_index - b.order_index);

  return {
    submission: submission as LessonSubmission,
    student_profile: studentProfile
      ? {
          display_name: studentProfile.display_name,
          email: studentProfile.email,
        }
      : null,
    answers,
  };
};
