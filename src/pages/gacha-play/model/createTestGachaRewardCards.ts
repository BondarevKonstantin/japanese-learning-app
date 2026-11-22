import type { GachaCardRarity } from '@/entities/gacha-card/model/types';

export type TestGachaRewardCard = {
  id: string;
  rarity: GachaCardRarity;
};

const rarities: readonly GachaCardRarity[] = ['common', 'rare', 'epic', 'legendary'];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickRarity = () => rarities[randomInt(0, rarities.length - 1)] ?? 'common';

export const createTestGachaRewardCards = (): TestGachaRewardCard[] => {
  const count = randomInt(1, 7);
  const cards = Array.from({ length: count }, () => ({
    id: crypto.randomUUID(),
    rarity: pickRarity(),
  }));

  const firstRarity = cards[0]?.rarity;

  if (count >= 2 && firstRarity && cards.every((card) => card.rarity === firstRarity)) {
    const alternatives = rarities.filter((rarity) => rarity !== firstRarity);
    const index = randomInt(0, count - 1);
    const card = cards[index];
    const rarity = alternatives[randomInt(0, alternatives.length - 1)];

    if (card && rarity) {
      cards[index] = { ...card, rarity };
    }
  }

  return cards;
};
