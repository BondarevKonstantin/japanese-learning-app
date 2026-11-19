import { insertTextAtCursor, type InsertTextAtCursorResult } from './insertTextAtCursor.ts';

export const THEORY_YOUTUBE_FENCE_LANGUAGE = 'theory-youtube';

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const YOUTU_BE_HOSTS = new Set(['youtu.be', 'www.youtu.be']);

const PATH_ID_PREFIXES = new Set(['embed', 'shorts', 'live', 'v']);

export type TheoryYoutubeBlock = {
  videoId: string;
};

export type TheoryYoutubeBlockSpan = {
  start: number;
  end: number;
  block: TheoryYoutubeBlock | null;
};

const OPEN_FENCE = /^ {0,3}```theory-youtube[ \t]*$/;
const CLOSE_FENCE = /^ {0,3}```[ \t]*$/;

type LineRange = {
  text: string;
  start: number;
  end: number;
};

export const isYoutubeVideoId = (value: string): boolean => {
  return VIDEO_ID_PATTERN.test(value);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const pathSegments = (url: URL): string[] => {
  return url.pathname.split('/').filter((segment) => segment.length > 0);
};

const readWatchOrPathVideoId = (url: URL): string | null => {
  const segments = pathSegments(url);

  if (segments.length === 1 && segments[0] === 'watch') {
    const videoId = url.searchParams.get('v');
    return videoId !== null && isYoutubeVideoId(videoId) ? videoId : null;
  }

  if (segments.length === 2) {
    const prefix = segments[0];
    const videoId = segments[1];
    if (prefix && videoId && PATH_ID_PREFIXES.has(prefix) && isYoutubeVideoId(videoId)) {
      return videoId;
    }
  }

  return null;
};

export const parseYoutubeVideoId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.username || url.password) {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }

  const hostname = url.hostname.toLowerCase();

  if (YOUTU_BE_HOSTS.has(hostname)) {
    const segments = pathSegments(url);
    const videoId = segments.length === 1 ? (segments[0] ?? null) : null;
    return videoId !== null && isYoutubeVideoId(videoId) ? videoId : null;
  }

  if (!YOUTUBE_HOSTS.has(hostname)) {
    return null;
  }

  return readWatchOrPathVideoId(url);
};

export const buildYoutubeEmbedUrl = (videoId: string): string | null => {
  if (!isYoutubeVideoId(videoId)) {
    return null;
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}`;
};

export const toEditableYoutubeUrl = (videoId: string): string => {
  if (!isYoutubeVideoId(videoId)) {
    return '';
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
};

const readTheoryYoutubeBlock = (value: unknown): TheoryYoutubeBlock | null => {
  if (!isRecord(value)) {
    return null;
  }

  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'videoId' || typeof value.videoId !== 'string') {
    return null;
  }

  if (!isYoutubeVideoId(value.videoId)) {
    return null;
  }

  return { videoId: value.videoId };
};

export const parseTheoryYoutubeBlock = (source: string): TheoryYoutubeBlock | null => {
  try {
    const parsed: unknown = JSON.parse(source);
    return readTheoryYoutubeBlock(parsed);
  } catch {
    return null;
  }
};

export const serializeTheoryYoutubeBlock = (block: TheoryYoutubeBlock): string => {
  return `\`\`\`${THEORY_YOUTUBE_FENCE_LANGUAGE}\n${JSON.stringify({ videoId: block.videoId })}\n\`\`\`\n`;
};

export const getYoutubeUrlError = (input: string): string | null => {
  if (!input.trim()) {
    return 'Вставьте ссылку на YouTube';
  }

  if (!parseYoutubeVideoId(input)) {
    return 'Некорректная ссылка YouTube';
  }

  return null;
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

export const findTheoryYoutubeBlockAtCursor = (
  markdown: string,
  cursor: number,
): TheoryYoutubeBlockSpan | null => {
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
        block: parseTheoryYoutubeBlock(source),
      };
    }

    index = closeIndex;
  }

  return null;
};

export const applyTheoryYoutubeBlock = ({
  markdown,
  block,
  selectionStart,
  selectionEnd,
  replaceRange,
}: {
  markdown: string;
  block: TheoryYoutubeBlock;
  selectionStart: number;
  selectionEnd: number;
  replaceRange: { start: number; end: number } | null;
}): InsertTextAtCursorResult => {
  const insertion = serializeTheoryYoutubeBlock(block);

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

export const removeTheoryYoutubeBlock = ({
  markdown,
  range,
}: {
  markdown: string;
  range: { start: number; end: number };
}): InsertTextAtCursorResult => {
  return {
    nextValue: `${markdown.slice(0, range.start)}${markdown.slice(range.end)}`,
    nextCursorPosition: range.start,
  };
};
