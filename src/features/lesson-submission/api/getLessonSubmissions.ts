import { supabase } from '@/shared/api/supabase/client';
import type { TeacherLessonSubmissionListItem } from '@/entities/lesson-submission/model/types';

export const getLessonSubmissions = async (
  lessonId: string,
): Promise<TeacherLessonSubmissionListItem[]> => {
  const { data, error } = await supabase
    .from('lesson_submissions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as TeacherLessonSubmissionListItem[];
};
