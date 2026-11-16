export type InsertTextAtCursorParams = {
  currentValue: string;
  insertion: string;
  selectionStart: number;
  selectionEnd: number;
  separateAsBlock?: boolean;
};

export type InsertTextAtCursorResult = {
  nextValue: string;
  nextCursorPosition: number;
};

const separationBefore = (before: string, separateAsBlock: boolean): string => {
  if (!separateAsBlock) {
    return before.length > 0 && !before.endsWith('\n') ? '\n' : '';
  }

  if (before.length === 0 || before.endsWith('\n\n')) {
    return '';
  }

  return before.endsWith('\n') ? '\n' : '\n\n';
};

const separationAfter = (after: string, separateAsBlock: boolean): string => {
  if (!separateAsBlock) {
    return after.length > 0 && !after.startsWith('\n') ? '\n' : '';
  }

  if (after.length === 0 || after.startsWith('\n')) {
    return '';
  }

  return '\n';
};

export const insertTextAtCursor = ({
  currentValue,
  insertion,
  selectionStart,
  selectionEnd,
  separateAsBlock = false,
}: InsertTextAtCursorParams): InsertTextAtCursorResult => {
  const before = currentValue.slice(0, selectionStart);
  const after = currentValue.slice(selectionEnd);
  const markdown = `${separationBefore(before, separateAsBlock)}${insertion}${separationAfter(after, separateAsBlock)}`;
  const nextValue = `${before}${markdown}${after}`;

  return {
    nextValue,
    nextCursorPosition: before.length + markdown.length,
  };
};
