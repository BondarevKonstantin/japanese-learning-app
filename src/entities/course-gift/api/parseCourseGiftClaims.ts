import {
  courseGiftStatuses,
  type CourseGiftClaim,
  type CourseGiftStatus,
} from '@/entities/course-gift/model/types';

export const invalidCourseGiftClaimsMessage = 'Некорректный ответ заявок на подарки';

const invalidCourseGiftClaimsResponse = () => new Error(invalidCourseGiftClaimsMessage);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCourseGiftStatus = (value: unknown): value is CourseGiftStatus => {
  return typeof value === 'string' && courseGiftStatuses.some((status) => status === value);
};

const isNullableString = (value: unknown): value is string | null => {
  return value === null || typeof value === 'string';
};

const parseCourseGiftClaim = (value: unknown): CourseGiftClaim => {
  if (!isRecord(value)) {
    throw invalidCourseGiftClaimsResponse();
  }

  const {
    user_id: userId,
    display_name: displayName,
    email,
    status,
    shipping_address: shippingAddress,
    updated_at: updatedAt,
    eligible,
  } = value;

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw invalidCourseGiftClaimsResponse();
  }

  if (!isNullableString(displayName) || typeof email !== 'string') {
    throw invalidCourseGiftClaimsResponse();
  }

  if (!(status === null || isCourseGiftStatus(status))) {
    throw invalidCourseGiftClaimsResponse();
  }

  if (!isNullableString(shippingAddress) || !isNullableString(updatedAt)) {
    throw invalidCourseGiftClaimsResponse();
  }

  if (typeof eligible !== 'boolean') {
    throw invalidCourseGiftClaimsResponse();
  }

  if (updatedAt !== null && updatedAt.trim().length === 0) {
    throw invalidCourseGiftClaimsResponse();
  }

  if ((status === null || status === 'declined') && shippingAddress !== null) {
    throw invalidCourseGiftClaimsResponse();
  }

  if (status === 'requested' && (shippingAddress === null || shippingAddress.trim().length === 0)) {
    throw invalidCourseGiftClaimsResponse();
  }

  return {
    user_id: userId,
    display_name: displayName,
    email,
    status,
    shipping_address: shippingAddress,
    updated_at: updatedAt,
    eligible,
  };
};

export const parseCourseGiftClaims = (value: unknown): CourseGiftClaim[] => {
  if (!Array.isArray(value)) {
    throw invalidCourseGiftClaimsResponse();
  }

  return value.map((item) => parseCourseGiftClaim(item));
};
