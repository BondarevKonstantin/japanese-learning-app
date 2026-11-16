import { insertTextAtCursor } from './insertTextAtCursor.ts';
import {
  applyTheoryMediaBlock,
  findTheoryMediaBlockAtCursor,
  getTheoryMediaBlockError,
  normalizeTheoryMediaBlock,
  parseTheoryMediaBlock,
  serializeTheoryMediaBlock,
  type TheoryMediaBlock,
} from './theoryMediaBlock.ts';

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

const sampleBlock: TheoryMediaBlock = {
  align: 'center',
  gap: 'md',
  items: [
    {
      src: 'https://cdn.example.com/a%20b.png?x=1&y=2#фрагмент',
      width: 50,
      caption: 'Кавычки "ё" \\ слэш <b> & амперсанд\nвторая строка',
    },
    {
      src: 'https://example.com/a(b).png',
      width: 25,
      caption: 'смотри ```код```',
    },
  ],
};

const serialized = serializeTheoryMediaBlock(sampleBlock);
assert(!serialized.includes('<img'), 'media block must not use raw image html');
assert(!serialized.includes('<iframe'), 'media block must not use iframe html');
assert(!serialized.includes('<script'), 'media block must not use script html');
assert(serialized.startsWith('```theory-images\n'), 'fence must open the block');
assert(serialized.endsWith('```\n'), 'fence must close the block');

const found = findTheoryMediaBlockAtCursor(serialized, 1);
assert(found?.block, 'cursor inside a new block must find it');
assertEqual(found?.block, sampleBlock, 'serialize then parse keeps special characters');

assert(findTheoryMediaBlockAtCursor(serialized, 0)?.block, 'cursor at the opening fence is inside');
assert(
  findTheoryMediaBlockAtCursor(serialized, serialized.length - 1)?.block,
  'cursor on the closing newline is inside',
);
assert(
  findTheoryMediaBlockAtCursor(`${serialized}Дальше`, serialized.length) === null,
  'cursor after the block is outside',
);

const crlf = serialized.replaceAll('\n', '\r\n');
assertEqual(findTheoryMediaBlockAtCursor(crlf, 4)?.block, sampleBlock, 'CRLF fences still parse');

const plainMarkdown = '# Заголовок\n\nТекст ![фото](https://example.com/a.png)\n\n- пункт\n';
assert(
  findTheoryMediaBlockAtCursor(plainMarkdown, 8) === null,
  'ordinary markdown is not treated as a media block',
);

const codeSample = '```js\nconst image = 1;\n```\n';
assert(findTheoryMediaBlockAtCursor(codeSample, 6) === null, 'other fences stay code');

assert(parseTheoryMediaBlock('{broken') === null, 'invalid json does not throw');
assert(
  parseTheoryMediaBlock(
    JSON.stringify({
      align: 'center',
      gap: 'md',
      items: [{ src: 'javascript:alert(1)', width: 100 }],
    }),
  ) === null,
  'javascript urls are rejected',
);
assert(
  parseTheoryMediaBlock(
    JSON.stringify({
      align: 'center',
      gap: 'md',
      items: [{ src: 'data:image/png;base64,aaaa', width: 100 }],
    }),
  ) === null,
  'data urls are rejected',
);
assert(
  parseTheoryMediaBlock(
    JSON.stringify({
      align: 'justify',
      gap: 'md',
      items: [{ src: 'https://example.com/a.png', width: 100 }],
    }),
  ) === null,
  'unknown align is rejected',
);
assert(
  parseTheoryMediaBlock(
    JSON.stringify({
      align: 'left',
      gap: 'md',
      items: [{ src: 'https://example.com/a.png', width: 40 }],
    }),
  ) === null,
  'arbitrary width is rejected',
);
assert(
  parseTheoryMediaBlock(
    JSON.stringify({
      align: 'left',
      gap: 'md',
      items: Array.from({ length: 5 }, () => ({
        src: 'https://example.com/a.png',
        width: 25,
      })),
    }),
  ) === null,
  'more than four images are rejected',
);

const brokenFence = 'Текст\n\n```theory-images\n{broken\n```\n\nДальше';
const brokenCursor = brokenFence.indexOf('{broken');
const brokenSpan = findTheoryMediaBlockAtCursor(brokenFence, brokenCursor);
assert(brokenSpan !== null && brokenSpan.block === null, 'broken fence is located without parsing');
assert(
  brokenFence.slice(brokenSpan?.start, brokenSpan?.end).includes('{broken'),
  'span covers the broken block',
);
assert(
  findTheoryMediaBlockAtCursor('```theory-images\n{"align":"center"}\n', 8) === null,
  'an unclosed fence does not swallow the search',
);

const first = serializeTheoryMediaBlock({
  align: 'left',
  gap: 'sm',
  items: [{ src: 'https://example.com/first.png', width: 100, caption: 'Первый' }],
});
const second = serializeTheoryMediaBlock({
  align: 'right',
  gap: 'lg',
  items: [{ src: 'https://example.com/second.png', width: 66 }],
});
const documentText = `Вступление\n\n![image](https://example.com/old.png)\n\n${first}\n${second}Конец`;
const originalDocument = documentText;
const secondCursor = documentText.indexOf('https://example.com/second.png');
const secondSpan = findTheoryMediaBlockAtCursor(documentText, secondCursor);
assert(
  secondSpan?.block?.items[0]?.src === 'https://example.com/second.png',
  'cursor finds the second block',
);

const updatedSecond: TheoryMediaBlock = {
  align: 'center',
  gap: 'md',
  items: [
    {
      src: 'https://example.com/updated.png',
      width: 33,
      caption: 'Обновлено "да"',
    },
  ],
};
const replaced = applyTheoryMediaBlock({
  markdown: documentText,
  block: updatedSecond,
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
assert(replaced.nextValue.includes(first), 'the other media block stays unchanged');
assert(
  replaced.nextValue.includes('https://example.com/updated.png'),
  'selected block is replaced',
);
assert(
  !replaced.nextValue.includes('https://example.com/second.png'),
  'old selected block is removed',
);
assert(replaced.nextValue.endsWith('Конец'), 'text after the blocks stays');

const inserted = applyTheoryMediaBlock({
  markdown: 'До SELECT после',
  block: {
    align: 'left',
    gap: 'sm',
    items: [{ src: 'https://example.com/new.png', width: 75, caption: '  Новая подпись  ' }],
  },
  selectionStart: 3,
  selectionEnd: 9,
  replaceRange: null,
});
assert(!inserted.nextValue.includes('SELECT'), 'selected text is replaced');
assert(
  inserted.nextValue.includes('До \n\n```theory-images'),
  'block is separated from the previous text',
);
assert(inserted.nextValue.includes('```\n\n после'), 'block is separated from the following text');
assert(
  findTheoryMediaBlockAtCursor(inserted.nextValue, inserted.nextValue.indexOf('Новая подпись'))
    ?.block?.items[0]?.caption === 'Новая подпись',
  'caption whitespace is trimmed when saving',
);

const emptyDraft: TheoryMediaBlock = {
  align: 'center',
  gap: 'md',
  items: [{ src: '', width: 100 }],
};
assert(
  getTheoryMediaBlockError(emptyDraft) === 'Укажите изображение 1',
  'empty image is rejected before save',
);
const normalized = normalizeTheoryMediaBlock(sampleBlock);
assert(getTheoryMediaBlockError(normalized) === null, 'a valid block has no error');
assertEqual(
  parseTheoryMediaBlock(
    serializeTheoryMediaBlock(normalized).replace(/^```theory-images\n|\n```\n$/g, ''),
  ),
  normalized,
  'a valid normalized block round-trips through the fence body',
);

const imageAtEnd = insertTextAtCursor({
  currentValue: 'hello',
  insertion: '![image](https://example.com/a.png)',
  selectionStart: 5,
  selectionEnd: 5,
});
assertEqual(
  imageAtEnd.nextValue,
  'hello\n![image](https://example.com/a.png)',
  'image insert keeps the old end behavior',
);
assertEqual(
  imageAtEnd.nextCursorPosition,
  imageAtEnd.nextValue.length,
  'image cursor stays after the insertion',
);

const imageAtStart = insertTextAtCursor({
  currentValue: 'hello',
  insertion: '![image](https://example.com/a.png)',
  selectionStart: 0,
  selectionEnd: 0,
});
assertEqual(
  imageAtStart.nextValue,
  '![image](https://example.com/a.png)\nhello',
  'image insert keeps the old start behavior',
);

const imageMiddle = insertTextAtCursor({
  currentValue: 'ab',
  insertion: '![image](https://example.com/a.png)',
  selectionStart: 1,
  selectionEnd: 1,
});
assertEqual(
  imageMiddle.nextValue,
  'a\n![image](https://example.com/a.png)\nb',
  'image insert keeps the old middle behavior',
);
assertEqual(
  imageMiddle.nextCursorPosition,
  'a\n![image](https://example.com/a.png)\n'.length,
  'image cursor is after the markdown',
);

const imageOnNewLine = insertTextAtCursor({
  currentValue: 'hello\n',
  insertion: '![image](https://example.com/a.png)',
  selectionStart: 6,
  selectionEnd: 6,
});
assertEqual(
  imageOnNewLine.nextValue,
  'hello\n![image](https://example.com/a.png)',
  'image insert does not add an extra newline',
);

console.log('theory media block checks passed');
