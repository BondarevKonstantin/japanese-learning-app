import { insertTextAtCursor } from '@/shared/lib/insertTextAtCursor';

type InsertMarkdownImageAtCursorParams = {
  currentValue: string;
  imageUrl: string;
  selectionStart: number;
  selectionEnd: number;
  alt?: string;
};

type InsertMarkdownImageAtCursorResult = {
  nextValue: string;
  nextCursorPosition: number;
};

export const insertMarkdownImageAtCursor = ({
  currentValue,
  imageUrl,
  selectionStart,
  selectionEnd,
  alt = 'image',
}: InsertMarkdownImageAtCursorParams): InsertMarkdownImageAtCursorResult => {
  return insertTextAtCursor({
    currentValue,
    insertion: `![${alt}](${imageUrl})`,
    selectionStart,
    selectionEnd,
  });
};
