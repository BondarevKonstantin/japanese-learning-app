import { cn } from '@/shared/lib/cn';
import { isSafeImageUrl } from '@/shared/lib/theoryMediaBlock';
import type {
  TheoryImageWidth,
  TheoryMediaAlign,
  TheoryMediaBlock,
  TheoryMediaGap,
} from '@/shared/lib/theoryMediaBlock';

type TheoryMediaBlockViewProps = {
  block: TheoryMediaBlock;
  onOpenImage: (src: string, alt: string) => void;
};

const GAP_CLASS: Record<TheoryMediaGap, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-8',
};

const ALIGN_CLASS: Record<TheoryMediaAlign, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const ITEM_WIDTH_CLASS: Record<TheoryMediaGap, Record<TheoryImageWidth, string>> = {
  sm: {
    25: 'w-full min-w-0 sm:w-[calc(25%-0.375rem)] sm:max-w-[calc(25%-0.375rem)]',
    33: 'w-full min-w-0 sm:w-[calc(33%-0.335rem)] sm:max-w-[calc(33%-0.335rem)]',
    50: 'w-full min-w-0 sm:w-[calc(50%-0.25rem)] sm:max-w-[calc(50%-0.25rem)]',
    66: 'w-full min-w-0 sm:w-[calc(66%-0.17rem)] sm:max-w-[calc(66%-0.17rem)]',
    75: 'w-full min-w-0 sm:w-[calc(75%-0.125rem)] sm:max-w-[calc(75%-0.125rem)]',
    100: 'w-full min-w-0 sm:w-full sm:max-w-full',
  },
  md: {
    25: 'w-full min-w-0 sm:w-[calc(25%-0.75rem)] sm:max-w-[calc(25%-0.75rem)]',
    33: 'w-full min-w-0 sm:w-[calc(33%-0.67rem)] sm:max-w-[calc(33%-0.67rem)]',
    50: 'w-full min-w-0 sm:w-[calc(50%-0.5rem)] sm:max-w-[calc(50%-0.5rem)]',
    66: 'w-full min-w-0 sm:w-[calc(66%-0.34rem)] sm:max-w-[calc(66%-0.34rem)]',
    75: 'w-full min-w-0 sm:w-[calc(75%-0.25rem)] sm:max-w-[calc(75%-0.25rem)]',
    100: 'w-full min-w-0 sm:w-full sm:max-w-full',
  },
  lg: {
    25: 'w-full min-w-0 sm:w-[calc(25%-1.5rem)] sm:max-w-[calc(25%-1.5rem)]',
    33: 'w-full min-w-0 sm:w-[calc(33%-1.34rem)] sm:max-w-[calc(33%-1.34rem)]',
    50: 'w-full min-w-0 sm:w-[calc(50%-1rem)] sm:max-w-[calc(50%-1rem)]',
    66: 'w-full min-w-0 sm:w-[calc(66%-0.68rem)] sm:max-w-[calc(66%-0.68rem)]',
    75: 'w-full min-w-0 sm:w-[calc(75%-0.5rem)] sm:max-w-[calc(75%-0.5rem)]',
    100: 'w-full min-w-0 sm:w-full sm:max-w-full',
  },
};

export const TheoryMediaBlockView = ({ block, onOpenImage }: TheoryMediaBlockViewProps) => {
  return (
    <div
      role="group"
      aria-label="Изображения"
      className={cn(
        'my-4 flex w-full max-w-full flex-wrap items-start',
        ALIGN_CLASS[block.align],
        GAP_CLASS[block.gap],
      )}
    >
      {block.items.map((item, index) => {
        const caption = item.caption?.trim() ?? '';
        const src = item.src.trim();
        const canOpen = isSafeImageUrl(src);

        return (
          <figure
            key={`${item.src}-${item.width}-${index}`}
            className={cn('max-w-full', ITEM_WIDTH_CLASS[block.gap][item.width])}
          >
            {canOpen ? (
              <button
                type="button"
                className="block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
                aria-label="Увеличить изображение"
                onClick={() => onOpenImage(src, caption || 'Изображение')}
              >
                <img
                  src={src}
                  alt=""
                  className="h-auto w-full rounded-2xl border border-border object-contain"
                />
              </button>
            ) : (
              <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-border bg-background px-3 py-6 text-center text-sm text-text-secondary">
                Нет изображения
              </div>
            )}
            {caption ? (
              <figcaption className="mt-2 whitespace-pre-wrap break-words text-center text-sm text-text-secondary">
                {caption}
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
};
