import { buildYoutubeEmbedUrl } from '@/shared/lib/theoryYoutubeBlock';

type TheoryYoutubeBlockViewProps = {
  videoId: string;
};

const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

export const TheoryYoutubeBlockView = ({ videoId }: TheoryYoutubeBlockViewProps) => {
  const src = buildYoutubeEmbedUrl(videoId);
  if (!src) {
    return null;
  }

  return (
    <div className="my-4 w-full max-w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-background">
        <iframe
          src={src}
          title="Видео YouTube"
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          allow={IFRAME_ALLOW}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
};
