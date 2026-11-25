import { useState } from 'react';

import { resolvePracticeItemMedia } from '@/features/lesson-practice-media/lib/practiceItemMedia';
import type { TheoryMediaBlock } from '@/shared/lib/theoryMediaBlock';
import { ImageLightbox, type LightboxImage } from '@/shared/ui/ImageLightbox';
import { TheoryMediaBlockView } from '@/shared/ui/TheoryMediaBlockView';

type PracticeItemMediaProps = {
  imageBlock: TheoryMediaBlock | null;
  imageUrl: string | null;
};

export const PracticeItemMedia = ({ imageBlock, imageUrl }: PracticeItemMediaProps) => {
  const block = resolvePracticeItemMedia(imageBlock, imageUrl);
  const [preview, setPreview] = useState<LightboxImage | null>(null);

  if (!block) {
    return null;
  }

  return (
    <>
      <TheoryMediaBlockView block={block} onOpenImage={(src, alt) => setPreview({ src, alt })} />
      <ImageLightbox image={preview} onClose={() => setPreview(null)} />
    </>
  );
};
