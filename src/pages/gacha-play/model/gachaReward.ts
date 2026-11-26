import type { SpinGachaCardDrop } from '@/entities/gacha/model/types';
import type { GachaCardRarity, GachaImageTransform } from '@/entities/gacha-card/model/types';

/**
 * One dropped card on the reward screen.
 * slotId is unique per slot, so the same card can appear more than once.
 */
export type GachaReward = {
  slotId: string;
  cardId: string;
  title: string;
  rarity: GachaCardRarity;
  imageUrl: string | null;
  imageTransform: GachaImageTransform | null;
};

type GachaRewardCardSource = {
  id: string;
  title: string;
  rarity: GachaCardRarity;
  image_url: string | null;
  image_transform: GachaImageTransform | null;
};

/** Keeps server order, duplicates, and every dropped card. Images are filled in later. */
export const createRewardsFromSpinCards = (cards: readonly SpinGachaCardDrop[]): GachaReward[] =>
  [...cards]
    .sort((left, right) => left.drop_number - right.drop_number)
    .map((card) => ({
      slotId: crypto.randomUUID(),
      cardId: card.id,
      title: card.title,
      rarity: card.rarity,
      imageUrl: null,
      imageTransform: null,
    }));

const randomRewardCount = () => Math.floor(Math.random() * 7) + 1;

export const pickRandomGachaRewards = (cards: readonly GachaRewardCardSource[]): GachaReward[] => {
  if (cards.length === 0) {
    throw new Error('У этого курса нет гача-карт');
  }

  const count = randomRewardCount();

  return Array.from({ length: count }, () => {
    const card = cards[Math.floor(Math.random() * cards.length)];

    if (!card) {
      throw new Error('У этого курса нет гача-карт');
    }

    return {
      slotId: crypto.randomUUID(),
      cardId: card.id,
      title: card.title,
      rarity: card.rarity,
      imageUrl: card.image_url,
      imageTransform: card.image_transform,
    };
  });
};
