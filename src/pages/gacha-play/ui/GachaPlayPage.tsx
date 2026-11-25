import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  createTestGachaRewardCards,
  type TestGachaRewardCard,
} from '@/pages/gacha-play/model/createTestGachaRewardCards';
import { useGachaMachinePlayback } from '@/pages/gacha-play/model/useGachaMachinePlayback';
import { useGachaPlayOverview } from '@/pages/gacha-play/model/useGachaPlayOverview';
import { GachaFireflies } from '@/pages/gacha-play/ui/GachaFireflies';
import { GachaPlayControls } from '@/pages/gacha-play/ui/GachaPlayControls';
import { GachaRewardOverlay } from '@/pages/gacha-play/ui/GachaRewardOverlay';
import { routes } from '@/shared/config/routes';
import { BackButton } from '@/shared/ui/BackButton';

const gachaMachineSrc = '/assets/gacha/scene/gachapon.lottie';
const streetBackgroundSrc = '/assets/gacha/scene/japan-street.png';

export const GachaPlayPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { overview, isLoading, errorMessage } = useGachaPlayOverview(courseId);
  const pendingRewardCardsRef = useRef<TestGachaRewardCard[] | null>(null);
  const spinLockedRef = useRef(false);
  const [rewardCards, setRewardCards] = useState<TestGachaRewardCard[] | null>(null);
  const handlePlaybackComplete = useCallback(() => {
    const cards = pendingRewardCardsRef.current;
    pendingRewardCardsRef.current = null;

    if (!cards || cards.length === 0) {
      spinLockedRef.current = false;
      return;
    }

    setRewardCards(cards);
  }, []);
  const handlePlaybackInterrupt = useCallback(() => {
    pendingRewardCardsRef.current = null;
    spinLockedRef.current = false;
  }, []);
  const { isPlaying, playerError, playFromStart, resetToStart, dotLottieRefCallback } =
    useGachaMachinePlayback({
      onComplete: handlePlaybackComplete,
      onInterrupt: handlePlaybackInterrupt,
    });

  const totalCards = overview?.totalCards ?? 0;
  const unlockedCount = overview?.unlockedCount ?? 0;
  const availablePulls = overview?.availablePulls ?? 0;
  const remainingCards = Math.max(0, totalCards - unlockedCount);
  const canSpin =
    overview !== null && !isLoading && errorMessage === '' && totalCards > 0 && availablePulls > 0;

  if (!courseId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background p-6 text-accent">
        Course id не найден
      </div>
    );
  }

  const phase = rewardCards ? 'rewards' : isPlaying ? 'playing' : 'idle';

  const handleSpin = () => {
    if (!canSpin || phase !== 'idle' || spinLockedRef.current) {
      return;
    }

    spinLockedRef.current = true;
    const cards = createTestGachaRewardCards();
    const started = playFromStart();

    if (!started) {
      spinLockedRef.current = false;
      return;
    }

    pendingRewardCardsRef.current = cards;
  };

  const handleCloseRewards = () => {
    resetToStart();
    spinLockedRef.current = false;
    setRewardCards(null);
  };

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-black">
      <img
        src={streetBackgroundSrc}
        alt=""
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
      />

      <GachaFireflies />

      <div className="pointer-events-none relative z-[2] flex min-h-0 flex-1 items-center justify-center px-4 pt-20 pb-4 [container-type:size]">
        <div className="aspect-square w-[min(100cqw,100cqh)] ml-12 mt-15">
          <DotLottieReact
            src={gachaMachineSrc}
            autoplay={false}
            loop={false}
            layout={{ fit: 'contain', align: [0.5, 0.5] }}
            dotLottieRefCallback={dotLottieRefCallback}
            className="block h-full w-full"
          />
        </div>
      </div>

      <div className="absolute top-4 left-4 z-10">
        <BackButton fallbackTo={routes.courseGacha.replace(':courseId', courseId)} label="Назад" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-sm shrink-0 px-4 pb-4 lg:absolute lg:top-24 lg:right-24 lg:mx-0 lg:w-64 lg:max-w-none lg:px-0 lg:pb-0">
        <GachaPlayControls
          availablePulls={availablePulls}
          remainingCards={remainingCards}
          totalCards={totalCards}
          isLoading={isLoading}
          errorMessage={errorMessage}
          playerError={playerError}
          isPlaying={isPlaying || phase === 'rewards'}
          onSpin={handleSpin}
        />
      </div>

      {phase === 'rewards' && rewardCards ? (
        <GachaRewardOverlay cards={rewardCards} onClose={handleCloseRewards} />
      ) : null}
    </main>
  );
};
