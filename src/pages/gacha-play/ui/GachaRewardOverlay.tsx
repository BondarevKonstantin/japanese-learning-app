import type { GachaCardRarity } from '@/entities/gacha-card/model/types';
import { cn } from '@/shared/lib/cn';
import './GachaRewardOverlay.css';

export type GachaRewardCardPreview = {
  id: string;
  rarity: GachaCardRarity;
};

type GachaRewardOverlayProps = {
  cards: readonly GachaRewardCardPreview[];
  onClose: () => void;
};

const rarityClassName: Record<GachaCardRarity, string> = {
  common:
    'bg-[linear-gradient(165deg,#f8efe0_0%,#e6d0aa_48%,#c4a574_100%)] shadow-[0_16px_30px_rgba(42,24,8,0.38)]',
  rare: 'bg-[linear-gradient(165deg,#d7e8ff_0%,#2f6fed_46%,#163e9c_100%)] shadow-[0_16px_30px_rgba(12,36,96,0.42)]',
  epic: 'bg-[linear-gradient(165deg,#f0e0ff_0%,#9b4dff_44%,#5b1d9e_100%)] shadow-[0_0_26px_rgba(168,85,247,0.55),0_16px_30px_rgba(48,16,92,0.42)]',
  legendary:
    'bg-[linear-gradient(165deg,#fff6d2_0%,#f2c14d_46%,#c88912_100%)] shadow-[0_0_28px_rgba(242,193,77,0.62),0_16px_30px_rgba(92,58,8,0.42)]',
};

const ClosedRewardCard = ({ rarity }: { rarity: GachaCardRarity }) => (
  <div
    className={cn(
      'gacha-reward-card relative aspect-[2/3] w-[6.75rem] shrink-0 overflow-hidden rounded-[1.15rem] sm:w-[8.25rem]',
      `gacha-reward-card--${rarity}`,
      rarityClassName[rarity],
    )}
  >
    <span className="pointer-events-none absolute inset-[7px] rounded-[0.85rem] border border-white/50" />
    <span className="pointer-events-none absolute inset-[11px] rounded-[0.7rem] border border-black/15" />
    <span className="pointer-events-none absolute top-[9%] right-[16%] left-[16%] h-[22%] rounded-full bg-white/25" />
    <span className="pointer-events-none absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border border-white/60 sm:h-8 sm:w-8" />
  </div>
);

export const GachaRewardOverlay = ({ cards, onClose }: GachaRewardOverlayProps) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="gacha-reward-title"
    className="gacha-reward-overlay absolute inset-0 z-30 overflow-x-hidden overflow-y-auto bg-black/70 backdrop-blur-[2px]"
  >
    <div className="flex min-h-full items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-[46rem] flex-col items-center gap-8">
        <h2 id="gacha-reward-title" className="sr-only">
          Закрытые карты
        </h2>
        <ul className="flex w-full list-none flex-wrap items-center justify-center gap-3 p-0 sm:gap-4">
          {cards.map((card) => (
            <li key={card.id}>
              <ClosedRewardCard rarity={card.rarity} />
            </li>
          ))}
        </ul>
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
