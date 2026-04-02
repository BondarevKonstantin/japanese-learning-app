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
  const before = currentValue.slice(0, selectionStart);
  const after = currentValue.slice(selectionEnd);

  const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
  const suffix = after.length > 0 && !after.startsWith('\n') ? '\n' : '';
  const markdown = `${prefix}![${alt}](${imageUrl})${suffix}`;

  const nextValue = `${before}${markdown}${after}`;
  const nextCursorPosition = before.length + markdown.length;

  return {
    nextValue,
    nextCursorPosition,
  };
};
