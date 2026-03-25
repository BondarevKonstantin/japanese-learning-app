export type LessonStatus = 'draft' | 'published' | 'archived';

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  theory_markdown: string;
  status: LessonStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
};
