import type { LessonPracticeItem } from '@/entities/lesson-practice/model/types';
import {
  getTheoryMediaBlockError,
  isSafeImageUrl,
  type TheoryMediaBlock,
} from '@/shared/lib/theoryMediaBlock';

export const resolvePracticeItemMedia = (
  imageBlock: TheoryMediaBlock | null,
  imageUrl: string | null,
): TheoryMediaBlock | null => {
  if (imageBlock && getTheoryMediaBlockError(imageBlock) === null) {
    return imageBlock;
  }

  const src = imageUrl?.trim() ?? '';
  if (!src || !isSafeImageUrl(src)) {
    return null;
  }

  return {
    align: 'center',
    gap: 'md',
    items: [{ src, width: 100 }],
  };
};

export const practiceMediaDraftFromItem = (
  item: Pick<LessonPracticeItem, 'image_block' | 'image_url'>,
): TheoryMediaBlock | null => {
  if (item.image_block && getTheoryMediaBlockError(item.image_block) === null) {
    return {
      align: item.image_block.align,
      gap: item.image_block.gap,
      items: item.image_block.items.map((image) => ({ ...image })),
    };
  }

  const src = item.image_url?.trim() ?? '';
  if (!src) {
    return null;
  }

  return {
    align: 'center',
    gap: 'md',
    items: [{ src, width: 100 }],
  };
};
