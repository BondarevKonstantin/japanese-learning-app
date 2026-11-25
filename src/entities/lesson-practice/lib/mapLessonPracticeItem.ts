import type {
  LessonPracticeItem,
  LessonPracticeItemType,
} from '@/entities/lesson-practice/model/types';
import { parseTheoryMediaBlockValue } from '@/shared/lib/theoryMediaBlock';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isPracticeItemType = (value: unknown): value is LessonPracticeItemType => {
  return value === 'multiple_choice' || value === 'input' || value === 'textarea';
};

const readNullableString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

const readOptions = (value: unknown): string[] | null => {
  if (value == null) {
    return null;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return null;
  }

  return value;
};

const readCorrectAnswer = (value: unknown): string | string[] => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }

  return '';
};

export const mapLessonPracticeItem = (value: unknown): LessonPracticeItem => {
  if (
    !isRecord(value) ||
    !isPracticeItemType(value.type) ||
    typeof value.order_index !== 'number'
  ) {
    throw new Error('Некорректные данные задания');
  }

  const id = readNullableString(value.id);
  const lessonId = readNullableString(value.lesson_id);
  const question = readNullableString(value.question);
  const createdAt = readNullableString(value.created_at);

  if (!id || !lessonId || question === null || !createdAt) {
    throw new Error('Некорректные данные задания');
  }

  const imageUrl = readNullableString(value.image_url)?.trim() ?? '';

  return {
    id,
    lesson_id: lessonId,
    type: value.type,
    question,
    options: readOptions(value.options),
    correct_answer: readCorrectAnswer(value.correct_answer),
    explanation: readNullableString(value.explanation),
    image_url: imageUrl || null,
    image_block: parseTheoryMediaBlockValue(value.image_block),
    order_index: value.order_index,
    created_at: createdAt,
  };
};
