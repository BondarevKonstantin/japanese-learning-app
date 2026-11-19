import { serializeTheoryMediaBlock } from './theoryMediaBlock.ts';
import {
  applyTheoryYoutubeBlock,
  buildYoutubeEmbedUrl,
  findTheoryYoutubeBlockAtCursor,
  getYoutubeUrlError,
  parseTheoryYoutubeBlock,
  parseYoutubeVideoId,
  removeTheoryYoutubeBlock,
  serializeTheoryYoutubeBlock,
  type TheoryYoutubeBlock,
} from './theoryYoutubeBlock.ts';

const VIDEO_ID = 'dQw4w9WgXcQ';
const OTHER_ID = 'AbC-_123456';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertEqual = (actual: unknown, expected: unknown, message: string): void => {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nactual: ${actualJson}\nexpected: ${expectedJson}`);
  }
};

const acceptedUrls = [
  `https://www.youtube.com/watch?v=${VIDEO_ID}`,
  `http://www.youtube.com/watch?v=${VIDEO_ID}`,
  `https://youtube.com/watch?v=${VIDEO_ID}`,
  `https://m.youtube.com/watch?v=${VIDEO_ID}`,
  `https://music.youtube.com/watch?v=${VIDEO_ID}`,
  `https://youtu.be/${VIDEO_ID}`,
  `https://www.youtu.be/${VIDEO_ID}`,
  `https://youtu.be/${VIDEO_ID}?t=43`,
  `https://www.youtube.com/shorts/${VIDEO_ID}`,
  `https://www.youtube.com/shorts/${VIDEO_ID}/`,
  `https://m.youtube.com/shorts/${VIDEO_ID}?feature=share`,
  `https://www.youtube.com/live/${VIDEO_ID}`,
  `https://www.youtube.com/embed/${VIDEO_ID}`,
  `https://www.youtube.com/embed/${VIDEO_ID}?start=30`,
  `https://www.youtube.com/v/${VIDEO_ID}`,
  `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
  `https://youtube-nocookie.com/embed/${VIDEO_ID}`,
  `https://www.youtube.com/watch?v=${VIDEO_ID}&list=PLxxxx&index=2`,
  `https://www.youtube.com/watch?app=desktop&v=${OTHER_ID}`,
  `  https://youtu.be/${OTHER_ID}  `,
];

for (const url of acceptedUrls) {
  const expected = url.includes(OTHER_ID) ? OTHER_ID : VIDEO_ID;
  assertEqual(parseYoutubeVideoId(url), expected, `accepted url: ${url}`);
}

const rejectedUrls = [
  '',
  '   ',
  'not a url',
  `youtube.com/watch?v=${VIDEO_ID}`,
  `https://youtube.com.evil.com/watch?v=${VIDEO_ID}`,
  `https://www.youtube.com.evil.com/embed/${VIDEO_ID}`,
  `https://youtu.be.evil.com/${VIDEO_ID}`,
  `https://evil.com/watch?v=${VIDEO_ID}`,
  `https://notyoutube.com/watch?v=${VIDEO_ID}`,
  `https://vimeo.com/${VIDEO_ID}`,
  `javascript:alert(${VIDEO_ID})`,
  `https://www.youtube.com/watch?v=short`,
  `https://www.youtube.com/watch?v=${VIDEO_ID}extra`,
  'https://www.youtube.com/watch',
  'https://www.youtube.com/playlist?list=PL123',
  `https://www.youtube.com/embed/${VIDEO_ID}/extra`,
  `https://youtu.be/${VIDEO_ID}/extra`,
  `https://user:pass@www.youtube.com/watch?v=${VIDEO_ID}`,
  `https://www.youtube.com/watch?v=${VIDEO_ID}<script>`,
  'data:text/html,hello',
  `https://example.com/${VIDEO_ID}`,
];

for (const url of rejectedUrls) {
  assert(parseYoutubeVideoId(url) === null, `rejected url: ${url}`);
}

assertEqual(
  buildYoutubeEmbedUrl(VIDEO_ID),
  `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
  'embed url uses the trusted nocookie host and no query',
);
assert(buildYoutubeEmbedUrl('bad') === null, 'invalid id does not build an embed url');
assert(buildYoutubeEmbedUrl(`${VIDEO_ID}?autoplay=1`) === null, 'query is not part of a video id');

const block: TheoryYoutubeBlock = { videoId: VIDEO_ID };
const serialized = serializeTheoryYoutubeBlock(block);
assert(!serialized.includes('<iframe'), 'youtube block must not use iframe html');
assert(!serialized.includes('<script'), 'youtube block must not use script html');
assert(serialized.startsWith('```theory-youtube\n'), 'fence must open the block');
assert(serialized.includes(`{"videoId":"${VIDEO_ID}"}`), 'payload stores only the video id');
assert(serialized.endsWith('```\n'), 'fence must close the block');

const body = serialized.replace(/^```theory-youtube\n|\n```\n$/g, '');
assertEqual(parseTheoryYoutubeBlock(body), block, 'serialize then parse keeps the video id');

assert(parseTheoryYoutubeBlock('{broken') === null, 'invalid json does not throw');
assert(
  parseTheoryYoutubeBlock(JSON.stringify({ videoId: 'short' })) === null,
  'short video id is rejected',
);
assert(
  parseTheoryYoutubeBlock(JSON.stringify({ videoId: VIDEO_ID, src: 'https://evil.example' })) ===
    null,
  'extra fields are rejected',
);
assert(parseTheoryYoutubeBlock(JSON.stringify([VIDEO_ID])) === null, 'arrays are rejected');
assert(
  parseTheoryYoutubeBlock(JSON.stringify({ videoId: '<script>alert(1)</script>' })) === null,
  'html video id is rejected',
);

const found = findTheoryYoutubeBlockAtCursor(serialized, 1);
assertEqual(found?.block, block, 'cursor inside a new block must find it');
assert(
  findTheoryYoutubeBlockAtCursor(serialized, 0)?.block,
  'cursor at the opening fence is inside',
);
assert(
  findTheoryYoutubeBlockAtCursor(serialized, serialized.length - 1)?.block,
  'cursor on the closing newline is inside',
);
assert(
  findTheoryYoutubeBlockAtCursor(`${serialized}Дальше`, serialized.length) === null,
  'cursor after the block is outside',
);

const crlf = serialized.replaceAll('\n', '\r\n');
assertEqual(findTheoryYoutubeBlockAtCursor(crlf, 4)?.block, block, 'CRLF fences still parse');

const imageBlock = serializeTheoryMediaBlock({
  align: 'center',
  gap: 'md',
  items: [{ src: 'https://example.com/a.png', width: 100, caption: 'Фото' }],
});
assert(
  findTheoryYoutubeBlockAtCursor(imageBlock, 4) === null,
  'image fences are not youtube blocks',
);
assert(
  findTheoryYoutubeBlockAtCursor('# Заголовок\n\nТекст ![фото](https://example.com/a.png)\n', 8) ===
    null,
  'ordinary markdown is not a youtube block',
);

const brokenFence = 'Текст\n\n```theory-youtube\n{broken\n```\n\nДальше';
const brokenCursor = brokenFence.indexOf('{broken');
const brokenSpan = findTheoryYoutubeBlockAtCursor(brokenFence, brokenCursor);
assert(brokenSpan !== null && brokenSpan.block === null, 'broken fence is located without parsing');
assert(
  brokenFence.slice(brokenSpan?.start, brokenSpan?.end).includes('{broken'),
  'span covers the broken block',
);
assert(
  findTheoryYoutubeBlockAtCursor('```theory-youtube\n{"videoId":"dQw4w9WgXcQ"}\n', 8) === null,
  'an unclosed fence does not swallow the search',
);

const first = serializeTheoryYoutubeBlock({ videoId: VIDEO_ID });
const second = serializeTheoryYoutubeBlock({ videoId: OTHER_ID });
const documentText = `Вступление\n\n![image](https://example.com/old.png)\n\n${imageBlock}\n${first}\n${second}Конец`;
const originalDocument = documentText;
const secondCursor = documentText.indexOf(OTHER_ID);
const secondSpan = findTheoryYoutubeBlockAtCursor(documentText, secondCursor);
assert(secondSpan?.block?.videoId === OTHER_ID, 'cursor finds the second video');

const replaced = applyTheoryYoutubeBlock({
  markdown: documentText,
  block: { videoId: 'jNQXAC9IVRw' },
  selectionStart: secondCursor,
  selectionEnd: secondCursor,
  replaceRange: secondSpan ? { start: secondSpan.start, end: secondSpan.end } : null,
});
assert(originalDocument === documentText, 'replace does not mutate the original markdown');
assert(replaced.nextValue.includes('Вступление'), 'text before the blocks stays');
assert(
  replaced.nextValue.includes('![image](https://example.com/old.png)'),
  'ordinary image markdown stays',
);
assert(replaced.nextValue.includes(imageBlock), 'the image media block stays unchanged');
assert(replaced.nextValue.includes(first), 'the other video block stays unchanged');
assert(replaced.nextValue.includes('jNQXAC9IVRw'), 'selected video is replaced');
assert(!replaced.nextValue.includes(OTHER_ID), 'old selected video is removed');
assert(replaced.nextValue.endsWith('Конец'), 'text after the blocks stays');
assertEqual(
  findTheoryYoutubeBlockAtCursor(replaced.nextValue, replaced.nextValue.indexOf('jNQXAC9IVRw'))
    ?.block,
  { videoId: 'jNQXAC9IVRw' },
  'replaced block parses again',
);

const inserted = applyTheoryYoutubeBlock({
  markdown: 'До SELECT после',
  block,
  selectionStart: 3,
  selectionEnd: 9,
  replaceRange: null,
});
assert(!inserted.nextValue.includes('SELECT'), 'selected text is replaced');
assert(
  inserted.nextValue.includes('До \n\n```theory-youtube'),
  'block is separated from the previous text',
);
assert(inserted.nextValue.includes('```\n\n после'), 'block is separated from the following text');
assert(
  findTheoryYoutubeBlockAtCursor(inserted.nextValue, inserted.nextValue.indexOf(VIDEO_ID))?.block
    ?.videoId === VIDEO_ID,
  'inserted block can be found at the new cursor area',
);

const removed = removeTheoryYoutubeBlock({
  markdown: documentText,
  range: secondSpan ? { start: secondSpan.start, end: secondSpan.end } : { start: 0, end: 0 },
});
assert(removed.nextValue.includes(first), 'delete keeps the other video');
assert(removed.nextValue.includes(imageBlock), 'delete keeps the image block');
assert(!removed.nextValue.includes(OTHER_ID), 'delete removes only the selected video');
assert(removed.nextValue.startsWith('Вступление'), 'delete keeps the leading text');
assert(removed.nextValue.endsWith('Конец'), 'delete keeps the trailing text');

const cancelled = documentText;
assert(cancelled === originalDocument, 'cancel leaves markdown untouched');

assertEqual(getYoutubeUrlError(''), 'Вставьте ссылку на YouTube', 'empty url has an error');
assertEqual(
  getYoutubeUrlError('https://evil.example'),
  'Некорректная ссылка YouTube',
  'foreign url has an error',
);
assert(getYoutubeUrlError(`https://youtu.be/${VIDEO_ID}`) === null, 'valid url has no error');

console.log('theory youtube block checks passed');
