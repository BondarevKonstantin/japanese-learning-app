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
  image_storage_path: string;
  /** Short-lived signed URL. Null until this user is allowed to read the object. */
  image_url: string | null;
  image_transform: GachaImageTransform | null;
  rarity: GachaCardRarity;
  created_by: string;
  created_at: string;
  updated_at: string;
};
