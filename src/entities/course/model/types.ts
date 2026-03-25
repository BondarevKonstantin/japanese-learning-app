export type CourseStatus = 'draft' | 'published' | 'archived';

export type Course = {
  id: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  order_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};
