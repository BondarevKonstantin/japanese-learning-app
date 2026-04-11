export type LessonSubmissionStatus = 'submitted' | 'reviewed';

export type LessonSubmission = {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  status: LessonSubmissionStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonSubmissionAnswer = {
  id: string;
  submission_id: string;
  practice_item_id: string;
  answer_text: string | null;
  is_auto_correct: boolean | null;
  teacher_comment: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonResultItem = {
  submission_id: string;
  submission_status: LessonSubmissionStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  practice_item_id: string;
  practice_item_type: 'multiple_choice' | 'input' | 'textarea';
  question: string;
  correct_answer: string | string[];
  explanation: string | null;
  image_url: string | null;
  answer_id: string;
  answer_text: string | null;
  is_auto_correct: boolean | null;
  teacher_comment: string | null;
};

export type TeacherLessonSubmissionListItem = LessonSubmission;

export type TeacherLessonSubmissionReviewItem = {
  answer_id: string;
  submission_id: string;
  practice_item_id: string;
  answer_text: string | null;
  is_auto_correct: boolean | null;
  teacher_comment: string | null;
  practice_item_type: 'multiple_choice' | 'input' | 'textarea';
  question: string;
  correct_answer: string | string[];
  explanation: string | null;
  image_url: string | null;
  order_index: number;
};

export type TeacherLessonSubmissionDetails = {
  submission: LessonSubmission;
  answers: TeacherLessonSubmissionReviewItem[];
};
