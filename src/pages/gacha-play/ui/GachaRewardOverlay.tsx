import { useState } from 'react';
import type { GachaCardRarity } from '@/entities/gacha-card/model/types';
import { GachaCard } from '@/entities/gacha-card/ui/GachaCard';
import type { GachaReward } from '@/pages/gacha-play/model/gachaReward';
import { cn } from '@/shared/lib/cn';
import './GachaRewardOverlay.css';

type GachaRewardOverlayProps = {
  cards: readonly GachaReward[];
  onClose: () => void;
  imageError?: string;
  isRetryingImages?: boolean;
  onRetryImages?: () => void;
};

const rarityBackClassName: Record<GachaCardRarity, string> = {
  common: 'bg-[linear-gradient(165deg,#f8efe0_0%,#e6d0aa_48%,#c4a574_100%)]',
  rare: 'bg-[linear-gradient(165deg,#d7e8ff_0%,#2f6fed_46%,#163e9c_100%)]',
  epic: 'bg-[linear-gradient(165deg,#f0e0ff_0%,#9b4dff_44%,#5b1d9e_100%)]',
  legendary: 'bg-[linear-gradient(165deg,#fff6d2_0%,#f2c14d_46%,#c88912_100%)]',
};

const rarityShadowClassName: Record<GachaCardRarity, string> = {
  common: 'shadow-[0_16px_30px_rgba(42,24,8,0.38)]',
  rare: 'shadow-[0_16px_30px_rgba(12,36,96,0.42)]',
  epic: 'shadow-[0_0_26px_rgba(168,85,247,0.55),0_16px_30px_rgba(48,16,92,0.42)]',
  legendary: 'shadow-[0_0_28px_rgba(242,193,77,0.62),0_16px_30px_rgba(92,58,8,0.42)]',
};

type RewardCardProps = {
  reward: GachaReward;
  isRevealed: boolean;
  onReveal: (slotId: string) => void;
};

const RewardCard = ({ reward, isRevealed, onReveal }: RewardCardProps) => (
  <button
    type="button"
    className={cn(
      'gacha-reward-card flex w-[6.75rem] shrink-0 cursor-pointer flex-col items-center border-0 bg-transparent p-0 text-inherit focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:w-[8.25rem]',
      `gacha-reward-card--${reward.rarity}`,
      isRevealed && 'gacha-reward-card--revealed',
    )}
    aria-label={isRevealed ? reward.title : 'Закрытая карта'}
    onClick={() => {
      if (isRevealed) {
        return;
      }

      onReveal(reward.slotId);
    }}
  >
    <div
      className={cn(
        'gacha-reward-card__lift',
        isRevealed ? 'shadow-none' : rarityShadowClassName[reward.rarity],
      )}
    >
      <div
        className={cn('gacha-reward-card__flip', isRevealed && 'gacha-reward-card__flip--revealed')}
      >
        <span
          className={cn(
            'gacha-reward-card__face gacha-reward-card__face--back',
            rarityBackClassName[reward.rarity],
          )}
        >
          <span className="pointer-events-none absolute inset-[7px] rounded-[0.85rem] border border-white/50" />
          <span className="pointer-events-none absolute inset-[11px] rounded-[0.7rem] border border-black/15" />
          <span className="pointer-events-none absolute top-[9%] right-[16%] left-[16%] h-[22%] rounded-full bg-white/25" />
          <span className="pointer-events-none absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border border-white/60 sm:h-8 sm:w-8" />
        </span>
        <div className="gacha-reward-card__face gacha-reward-card__face--front">
          <GachaCard
            rarity={reward.rarity}
            imageUrl={reward.imageUrl ?? ''}
            imageTransform={reward.imageTransform}
            alt={reward.title}
            className="h-full"
          />
        </div>
      </div>
    </div>
    {isRevealed ? <span className="gacha-reward-card__title">{reward.title}</span> : null}
  </button>
);

export const GachaRewardOverlay = ({
  cards,
  onClose,
  imageError = '',
  isRetryingImages = false,
  onRetryImages,
}: GachaRewardOverlayProps) => {
  const [revealedSlotIds, setRevealedSlotIds] = useState<ReadonlySet<string>>(() => new Set());

  const revealCard = (slotId: string) => {
    setRevealedSlotIds((current) => {
      if (current.has(slotId)) {
        return current;
      }

      const next = new Set(current);
      next.add(slotId);
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gacha-reward-title"
      className="gacha-reward-overlay absolute inset-0 z-30 overflow-x-hidden overflow-y-auto bg-black/70 backdrop-blur-[2px]"
    >
      <div className="flex min-h-full w-full items-center justify-center px-4 py-8">
        <div className="flex w-full min-w-0 max-w-[46rem] flex-col items-center gap-8">
          <h2 id="gacha-reward-title" className="sr-only">
            Закрытые карты
          </h2>
          <ul className="flex w-full max-w-full list-none flex-wrap items-center justify-center gap-3 p-0 sm:gap-4">
            {cards.map((reward) => (
              <li key={reward.slotId}>
                <RewardCard
                  reward={reward}
                  isRevealed={revealedSlotIds.has(reward.slotId)}
                  onReveal={revealCard}
                />
              </li>
            ))}
          </ul>
          {imageError ? (
            <div className="flex w-full max-w-md flex-col items-center gap-3">
              <p className="text-center text-sm text-white">{imageError}</p>
              {onRetryImages ? (
                <button
                  type="button"
                  onClick={onRetryImages}
                  disabled={isRetryingImages}
                  aria-busy={isRetryingImages}
                  className="rounded-2xl border border-white/80 bg-white/10 px-6 py-3 font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Повторить загрузку изображений
                </button>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-primary px-8 py-3 font-medium text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition hover:opacity-90"
          >
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
};
