import { supabase } from '@/shared/api/supabase/client';
import type {
  LessonSubmission,
  StudentSubmissionProfile,
  TeacherLessonSubmissionListItem,
} from '@/entities/lesson-submission/model/types';

type StudentProfileRow = StudentSubmissionProfile & {
  id: string;
};

export const getLessonSubmissions = async (
  lessonId: string,
): Promise<TeacherLessonSubmissionListItem[]> => {
  const { data: submissionRows, error: submissionsError } = await supabase
    .from('lesson_submissions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (submissionsError) {
    throw submissionsError;
  }

  const submissions = (submissionRows ?? []) as LessonSubmission[];
  const studentIds = [...new Set(submissions.map((submission) => submission.user_id))];

  if (studentIds.length === 0) {
    return [];
  }

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', studentIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map(
    ((profileRows ?? []) as StudentProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return submissions.map((submission) => {
    const profile = profilesById.get(submission.user_id);

    return {
      ...submission,
      student_profile: profile
        ? {
            display_name: profile.display_name,
            email: profile.email,
          }
        : null,
    };
  });
};
