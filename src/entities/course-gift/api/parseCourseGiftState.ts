import {
  courseGiftStatuses,
  type CourseGiftState,
  type CourseGiftStatus,
} from '@/entities/course-gift/model/types';

const invalidCourseGiftResponse = () => new Error('Некорректный ответ подарка курса');

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCourseGiftStatus = (value: unknown): value is CourseGiftStatus => {
  return typeof value === 'string' && courseGiftStatuses.some((status) => status === value);
};

const isNullableString = (value: unknown): value is string | null => {
  return value === null || typeof value === 'string';
};

export const parseCourseGiftState = (value: unknown): CourseGiftState => {
  if (!isRecord(value)) {
    throw invalidCourseGiftResponse();
  }

  const {
    enabled,
    eligible,
    status,
    shipping_address: shippingAddress,
    updated_at: updatedAt,
  } = value;

  if (typeof enabled !== 'boolean' || typeof eligible !== 'boolean') {
    throw invalidCourseGiftResponse();
  }

  if (!(status === null || isCourseGiftStatus(status))) {
    throw invalidCourseGiftResponse();
  }

  if (!isNullableString(shippingAddress) || !isNullableString(updatedAt)) {
    throw invalidCourseGiftResponse();
  }

  if (updatedAt !== null && updatedAt.trim().length === 0) {
    throw invalidCourseGiftResponse();
  }

  if ((status === null || status === 'declined') && shippingAddress !== null) {
    throw invalidCourseGiftResponse();
  }

  if (status === 'requested' && (shippingAddress === null || shippingAddress.trim().length === 0)) {
    throw invalidCourseGiftResponse();
  }

  return {
    enabled,
    eligible,
    status,
    shipping_address: shippingAddress,
    updated_at: updatedAt,
  };
};
