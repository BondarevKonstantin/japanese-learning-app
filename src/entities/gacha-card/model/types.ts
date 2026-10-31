export type GachaCardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type GachaImageTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type GachaCard = {
  id: string;
  course_id: string;
  title: string;
  image_url: string;
  image_transform: GachaImageTransform | null;
  rarity: GachaCardRarity;
  created_by: string;
  created_at: string;
  updated_at: string;
};
