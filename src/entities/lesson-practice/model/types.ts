export type LessonPracticeItemType = 'multiple_choice' | 'input' | 'textarea';

export type LessonPracticeItem = {
  id: string;
  lesson_id: string;
  type: LessonPracticeItemType;
  question: string;
  options: string[] | null;
  correct_answer: string | string[];
  explanation: string | null;
  image_url: string | null;
  order_index: number;
  created_at: string;
};
