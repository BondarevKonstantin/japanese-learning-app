import { parseCourseGiftClaims } from '@/entities/course-gift/api/parseCourseGiftClaims';
import type { CourseGiftClaim } from '@/entities/course-gift/model/types';
import { supabase } from '@/shared/api/supabase/client';

export const courseGiftClaimsAccessDeniedCode = '42501';
export const courseGiftClaimsNotConfiguredCode = '22023';

export class CourseGiftClaimsRequestError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null) {
    super(message);
    this.name = 'CourseGiftClaimsRequestError';
    this.code = code;
  }
}

export const getCourseGiftClaims = async (courseId: string): Promise<CourseGiftClaim[]> => {
  const normalizedCourseId = courseId.trim();

  if (!normalizedCourseId) {
    throw new Error('Курс не найден.');
  }

  const { data, error } = await supabase.rpc('get_course_gift_claims', {
    p_course_id: normalizedCourseId,
  });

  if (error) {
    throw new CourseGiftClaimsRequestError(error.message, error.code ?? null);
  }

  return parseCourseGiftClaims(data);
};
