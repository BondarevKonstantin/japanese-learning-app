export const COURSE_GIFT_ADDRESS_MAX_LENGTH = 2000;

export const courseGiftAddressRequiredMessage = 'Укажи адрес доставки.';

export const courseGiftAddressTooLongMessage = `Адрес не должен быть длиннее ${COURSE_GIFT_ADDRESS_MAX_LENGTH} символов.`;

export const courseGiftStatuses = ['requested', 'declined'] as const;

export type CourseGiftStatus = (typeof courseGiftStatuses)[number];

export type CourseGiftState = {
  enabled: boolean;
  eligible: boolean;
  status: CourseGiftStatus | null;
  shipping_address: string | null;
  updated_at: string | null;
};

export type CourseGiftSummary = Omit<CourseGiftState, 'shipping_address'>;

export type CourseGiftClaim = {
  user_id: string;
  display_name: string | null;
  email: string;
  status: CourseGiftStatus | null;
  shipping_address: string | null;
  updated_at: string | null;
  eligible: boolean;
};
