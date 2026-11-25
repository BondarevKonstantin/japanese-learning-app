import { insertTextAtCursor, type InsertTextAtCursorResult } from './insertTextAtCursor.ts';

export const THEORY_MEDIA_FENCE_LANGUAGE = 'theory-images';

export const THEORY_IMAGE_WIDTHS = [25, 33, 50, 66, 75, 100] as const;
export const THEORY_MEDIA_ALIGNS = ['left', 'center', 'right'] as const;
export const THEORY_MEDIA_GAPS = ['sm', 'md', 'lg'] as const;

export type TheoryImageWidth = (typeof THEORY_IMAGE_WIDTHS)[number];
export type TheoryMediaAlign = (typeof THEORY_MEDIA_ALIGNS)[number];
export type TheoryMediaGap = (typeof THEORY_MEDIA_GAPS)[number];

export type TheoryMediaImage = {
  src: string;
  width: TheoryImageWidth;
  caption?: string;
};

export type TheoryMediaBlock = {
  align: TheoryMediaAlign;
  gap: TheoryMediaGap;
  items: TheoryMediaImage[];
};

export type TheoryMediaBlockSpan = {
  start: number;
  end: number;
  block: TheoryMediaBlock | null;
};

const MIN_ITEMS = 1;
export const THEORY_MEDIA_MAX_ITEMS = 4;
const OPEN_FENCE = /^ {0,3}```theory-images[ \t]*$/;
const CLOSE_FENCE = /^ {0,3}```[ \t]*$/;

type LineRange = {
  text: string;
  start: number;
  end: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isTheoryImageWidth = (value: unknown): value is TheoryImageWidth => {
  return THEORY_IMAGE_WIDTHS.some((width) => width === value);
};

const isTheoryMediaAlign = (value: unknown): value is TheoryMediaAlign => {
  return THEORY_MEDIA_ALIGNS.some((align) => align === value);
};

const isTheoryMediaGap = (value: unknown): value is TheoryMediaGap => {
  return THEORY_MEDIA_GAPS.some((gap) => gap === value);
};

export const isSafeImageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const readCaption = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const caption = value.trim();
  return caption.length > 0 ? caption : undefined;
};

const readImage = (value: unknown): TheoryMediaImage | null => {
  if (!isRecord(value) || typeof value.src !== 'string' || !isTheoryImageWidth(value.width)) {
    return null;
  }

  const src = value.src.trim();
  if (!isSafeImageUrl(src)) {
    return null;
  }

  const caption = readCaption(value.caption);
  if (caption === null) {
    return null;
  }

  return caption ? { src, width: value.width, caption } : { src, width: value.width };
};

const readTheoryMediaBlock = (value: unknown): TheoryMediaBlock | null => {
  if (!isRecord(value) || !isTheoryMediaAlign(value.align) || !isTheoryMediaGap(value.gap)) {
    return null;
  }

  if (
    !Array.isArray(value.items) ||
    value.items.length < MIN_ITEMS ||
    value.items.length > THEORY_MEDIA_MAX_ITEMS
  ) {
    return null;
  }

  const items: TheoryMediaImage[] = [];

  for (const item of value.items) {
    const image = readImage(item);
    if (!image) {
      return null;
    }
    items.push(image);
  }

  return {
    align: value.align,
    gap: value.gap,
    items,
  };
};

export const parseTheoryMediaBlock = (source: string): TheoryMediaBlock | null => {
  try {
    const parsed: unknown = JSON.parse(source);
    return readTheoryMediaBlock(parsed);
  } catch {
    return null;
  }
};

export const parseTheoryMediaBlockValue = (value: unknown): TheoryMediaBlock | null => {
  if (typeof value === 'string') {
    return parseTheoryMediaBlock(value);
  }

  return readTheoryMediaBlock(value);
};

export const serializeTheoryMediaBlock = (block: TheoryMediaBlock): string => {
  const payload = {
    align: block.align,
    gap: block.gap,
    items: block.items.map((item) => {
      const caption = item.caption?.trim();
      return caption
        ? { src: item.src.trim(), width: item.width, caption }
        : { src: item.src.trim(), width: item.width };
    }),
  };

  return `\`\`\`${THEORY_MEDIA_FENCE_LANGUAGE}\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
};

export const createDefaultTheoryMediaBlock = (): TheoryMediaBlock => {
  return {
    align: 'center',
    gap: 'md',
    items: [{ src: '', width: 100 }],
  };
};

export const getTheoryMediaBlockError = (block: TheoryMediaBlock): string | null => {
  if (!isTheoryMediaAlign(block.align) || !isTheoryMediaGap(block.gap)) {
    return 'Некорректные настройки блока';
  }

  if (block.items.length < MIN_ITEMS) {
    return 'Добавьте хотя бы одно изображение';
  }

  if (block.items.length > THEORY_MEDIA_MAX_ITEMS) {
    return 'В блоке может быть не больше четырёх изображений';
  }

  for (const [index, item] of block.items.entries()) {
    if (!isTheoryImageWidth(item.width)) {
      return `Некорректный размер изображения ${index + 1}`;
    }

    if (!item.src.trim()) {
      return `Укажите изображение ${index + 1}`;
    }

    if (!isSafeImageUrl(item.src.trim())) {
      return `Некорректный URL изображения ${index + 1}`;
    }
  }

  return null;
};

export const normalizeTheoryMediaBlock = (block: TheoryMediaBlock): TheoryMediaBlock => {
  return {
    align: block.align,
    gap: block.gap,
    items: block.items.map((item) => {
      const caption = item.caption?.trim();
      const src = item.src.trim();
      return caption ? { src, width: item.width, caption } : { src, width: item.width };
    }),
  };
};

const listLines = (markdown: string): LineRange[] => {
  const lines: LineRange[] = [];
  let start = 0;

  while (start < markdown.length) {
    const newlineIndex = markdown.indexOf('\n', start);

    if (newlineIndex === -1) {
      const raw = markdown.slice(start);
      lines.push({
        text: raw.endsWith('\r') ? raw.slice(0, -1) : raw,
        start,
        end: markdown.length,
      });
      break;
    }

    const raw = markdown.slice(start, newlineIndex);
    lines.push({
      text: raw.endsWith('\r') ? raw.slice(0, -1) : raw,
      start,
      end: newlineIndex + 1,
    });
    start = newlineIndex + 1;
  }

  return lines;
};

export const findTheoryMediaBlockAtCursor = (
  markdown: string,
  cursor: number,
): TheoryMediaBlockSpan | null => {
  const lines = listLines(markdown);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || !OPEN_FENCE.test(line.text)) {
      continue;
    }

    let closeIndex = -1;
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex];
      if (nextLine && CLOSE_FENCE.test(nextLine.text)) {
        closeIndex = nextIndex;
        break;
      }
    }

    if (closeIndex === -1) {
      return null;
    }

    const closeLine = lines[closeIndex];
    if (!closeLine) {
      return null;
    }

    const start = line.start;
    const end = closeLine.end;

    if (cursor >= start && cursor < end) {
      const source = lines
        .slice(index + 1, closeIndex)
        .map((item) => item.text)
        .join('\n');

      return {
        start,
        end,
        block: parseTheoryMediaBlock(source),
      };
    }

    index = closeIndex;
  }

  return null;
};

export const applyTheoryMediaBlock = ({
  markdown,
  block,
  selectionStart,
  selectionEnd,
  replaceRange,
}: {
  markdown: string;
  block: TheoryMediaBlock;
  selectionStart: number;
  selectionEnd: number;
  replaceRange: { start: number; end: number } | null;
}): InsertTextAtCursorResult => {
  const insertion = serializeTheoryMediaBlock(block);

  if (replaceRange) {
    const nextValue = `${markdown.slice(0, replaceRange.start)}${insertion}${markdown.slice(replaceRange.end)}`;
    return {
      nextValue,
      nextCursorPosition: replaceRange.start + insertion.length,
    };
  }

  return insertTextAtCursor({
    currentValue: markdown,
    insertion,
    selectionStart,
    selectionEnd,
    separateAsBlock: true,
  });
};
