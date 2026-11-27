import {
  COURSE_GIFT_ADDRESS_MAX_LENGTH,
  courseGiftAddressRequiredMessage,
  courseGiftAddressTooLongMessage,
  type CourseGiftState,
  type CourseGiftSummary,
} from '@/entities/course-gift/model/types';

export type CourseGiftFormMode = 'student' | 'teacher-preview';

export const createPreviewGiftState = (): CourseGiftState => ({
  enabled: true,
  eligible: true,
  status: null,
  shipping_address: null,
  updated_at: null,
});

export const addressDraftFromGiftState = (state: CourseGiftState): string => {
  if (state.status !== 'requested' || state.shipping_address === null) {
    return '';
  }

  return state.shipping_address;
};

export const canSubmitCourseGiftAddress = (state: CourseGiftSummary): boolean => {
  return state.enabled && state.eligible;
};

export const canDeclineCourseGift = (state: CourseGiftSummary): boolean => {
  return state.status === 'requested' || (state.enabled && state.eligible);
};

export const getCourseGiftAddressError = (address: string): string | null => {
  const trimmed = address.trim();

  if (!trimmed) {
    return courseGiftAddressRequiredMessage;
  }

  if (trimmed.length > COURSE_GIFT_ADDRESS_MAX_LENGTH) {
    return courseGiftAddressTooLongMessage;
  }

  return null;
};

export const getCourseGiftBlockedMessage = (state: CourseGiftSummary): string | null => {
  if (canSubmitCourseGiftAddress(state)) {
    return null;
  }

  if (state.status === 'requested') {
    return state.enabled
      ? 'Сейчас нельзя изменить адрес. Можно отказаться от подарка.'
      : 'Подарки для этого курса сейчас недоступны. Можно отказаться от уже запрошенного подарка.';
  }

  if (state.status === 'declined') {
    return state.enabled
      ? 'Ты отказался от подарка. Сейчас нельзя запросить его снова.'
      : 'Подарки для этого курса сейчас недоступны.';
  }

  if (!state.enabled) {
    return 'Подарки для этого курса сейчас недоступны.';
  }

  return 'Сейчас нельзя запросить подарок.';
};

export const getCourseGiftStatusMessage = (state: CourseGiftSummary): string | null => {
  if (!canSubmitCourseGiftAddress(state)) {
    return null;
  }

  if (state.status === 'requested') {
    return 'Подарок запрошен. Адрес можно изменить или отказаться от подарка.';
  }

  if (state.status === 'declined') {
    return 'Ты отказался от подарка. Можно передумать и отправить адрес.';
  }

  return null;
};

export type CourseGiftPanelModel = {
  title: string;
  description: string;
  actionLabel: string | null;
};

export const getCourseGiftPanelModel = (state: CourseGiftSummary): CourseGiftPanelModel | null => {
  const canRequest = canSubmitCourseGiftAddress(state);

  if (state.status === null && !canRequest) {
    return null;
  }

  if (state.status === 'requested') {
    if (!canRequest) {
      const limitation =
        getCourseGiftBlockedMessage(state) ??
        'Сейчас нельзя изменить адрес. Можно отказаться от подарка.';

      return {
        title: 'Данные получены!',
        description: `Спасибо! Теперь жди свой подарок из Японии. ${limitation}`,
        actionLabel: 'Изменить решение',
      };
    }

    return {
      title: 'Данные получены!',
      description: 'Спасибо! Теперь жди свой подарок из Японии.',
      actionLabel: 'Изменить решение или адрес',
    };
  }

  if (state.status === 'declined') {
    if (!canRequest) {
      return {
        title: 'Подарок сейчас недоступен',
        description: getCourseGiftBlockedMessage(state) ?? 'Сейчас нельзя запросить подарок.',
        actionLabel: null,
      };
    }

    return {
      title: 'Передумал?',
      description:
        'Если ты всё-таки захочешь получить подарок из Японии, мы будем рады его отправить!',
      actionLabel: 'Получить подарок',
    };
  }

  return {
    title: 'Твой подарок ждёт тебя!',
    description: 'Ты завершил курс и можешь получить сувенир из Японии.',
    actionLabel: 'Заполнить данные',
  };
};
