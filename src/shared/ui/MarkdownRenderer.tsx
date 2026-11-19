import { isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';

import {
  isSafeImageUrl,
  parseTheoryMediaBlock,
  THEORY_MEDIA_FENCE_LANGUAGE,
} from '@/shared/lib/theoryMediaBlock';
import {
  parseTheoryYoutubeBlock,
  THEORY_YOUTUBE_FENCE_LANGUAGE,
} from '@/shared/lib/theoryYoutubeBlock';
import { ImageLightbox, type LightboxImage } from '@/shared/ui/ImageLightbox';
import { TheoryMediaBlockView } from '@/shared/ui/TheoryMediaBlockView';
import { TheoryYoutubeBlockView } from '@/shared/ui/TheoryYoutubeBlockView';

type Props = {
  content: string;
};

const readFenceLanguage = (className: string | undefined): string | null => {
  if (!className) {
    return null;
  }

  const match = /(?:^|\s)language-([^\s]+)/.exec(className);
  return match?.[1] ?? null;
};

const readNodeText = (children: ReactNode): string => {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map((child) => readNodeText(child)).join('');
  }

  return '';
};

const findMediaView = (children: ReactNode): ReactElement | null => {
  const nodes = Array.isArray(children) ? children : [children];
  const elements = nodes.filter((node) => isValidElement(node));
  const mediaView = elements.length === 1 ? elements[0] : null;

  if (mediaView?.type === TheoryMediaBlockView || mediaView?.type === TheoryYoutubeBlockView) {
    return mediaView;
  }

  return null;
};

export const MarkdownRenderer = ({ content }: Props) => {
  const [preview, setPreview] = useState<LightboxImage | null>(null);

  const openImage = (src: string, alt: string) => {
    if (!isSafeImageUrl(src)) {
      return;
    }

    setPreview({ src, alt });
  };

  return (
    <div className="text-text-primary leading-7">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 text-3xl font-bold leading-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 text-2xl font-semibold leading-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-6 text-xl font-semibold leading-tight">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-5 text-lg font-semibold leading-tight">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-base leading-7 text-text-primary">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-text-primary">{children}</em>,
          ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-6">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-primary pl-4 italic text-text-secondary">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border" />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-accent underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => {
            const mediaView = findMediaView(children);
            if (mediaView) {
              return mediaView;
            }

            return <pre>{children}</pre>;
          },
          code: ({ className, children }) => {
            const source = readNodeText(children).replace(/\n$/, '');
            const language = readFenceLanguage(className);
            if (language === THEORY_MEDIA_FENCE_LANGUAGE) {
              const block = parseTheoryMediaBlock(source);
              if (block) {
                return <TheoryMediaBlockView block={block} onOpenImage={openImage} />;
              }
            }

            if (language === THEORY_YOUTUBE_FENCE_LANGUAGE) {
              const block = parseTheoryYoutubeBlock(source);
              if (block) {
                return <TheoryYoutubeBlockView videoId={block.videoId} />;
              }
            }

            return <code className="rounded bg-surface px-1.5 py-0.5 text-sm">{children}</code>;
          },
          img: ({ src, alt }) => {
            const imageSrc = typeof src === 'string' ? src : '';
            const imageAlt = typeof alt === 'string' ? alt : '';

            if (!isSafeImageUrl(imageSrc)) {
              return imageAlt ? <span>{imageAlt}</span> : null;
            }

            return (
              <button
                type="button"
                className="my-4 block max-w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
                aria-label={imageAlt ? `Увеличить: ${imageAlt}` : 'Увеличить изображение'}
                onClick={() => openImage(imageSrc, imageAlt || 'Изображение')}
              >
                <img
                  src={imageSrc}
                  alt=""
                  className="h-auto w-80 max-w-full rounded-2xl border border-border"
                />
              </button>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      <ImageLightbox image={preview} onClose={() => setPreview(null)} />
    </div>
  );
};
