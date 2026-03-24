export type GachaCardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type GachaCard = {
  id: string;
  course_id: string;
  title: string;
  image_url: string;
  rarity: GachaCardRarity;
  created_by: string;
  created_at: string;
  updated_at: string;
};
