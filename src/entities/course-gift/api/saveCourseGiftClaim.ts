import { parseCourseGiftState } from '@/entities/course-gift/api/parseCourseGiftState';
import {
  COURSE_GIFT_ADDRESS_MAX_LENGTH,
  courseGiftAddressRequiredMessage,
  courseGiftAddressTooLongMessage,
  type CourseGiftState,
  type CourseGiftStatus,
} from '@/entities/course-gift/model/types';
import { supabase } from '@/shared/api/supabase/client';

export type SaveCourseGiftClaimParams = {
  courseId: string;
  status: CourseGiftStatus;
  shippingAddress: string | null;
};

export const saveCourseGiftClaim = async ({
  courseId,
  status,
  shippingAddress,
}: SaveCourseGiftClaimParams): Promise<CourseGiftState> => {
  const normalizedCourseId = courseId.trim();

  if (!normalizedCourseId) {
    throw new Error('Курс не найден.');
  }

  const trimmedAddress = shippingAddress?.trim() ?? '';
  let payloadAddress: string | null = null;

  if (status === 'requested') {
    if (!trimmedAddress) {
      throw new Error(courseGiftAddressRequiredMessage);
    }

    if (trimmedAddress.length > COURSE_GIFT_ADDRESS_MAX_LENGTH) {
      throw new Error(courseGiftAddressTooLongMessage);
    }

    payloadAddress = trimmedAddress;
  }

  const { data, error } = await supabase.rpc('save_course_gift_claim', {
    p_course_id: normalizedCourseId,
    p_status: status,
    p_shipping_address: payloadAddress,
  });

  if (error) {
    throw new Error(error.message);
  }

  return parseCourseGiftState(data);
};
