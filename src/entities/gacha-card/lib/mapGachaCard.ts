import { parseGachaImageTransform } from '@/entities/gacha-card/model/imageTransform';
import type { GachaCard } from '@/entities/gacha-card/model/types';

type GachaCardRow = Omit<GachaCard, 'image_transform'> & {
  image_transform?: unknown;
};

export const mapGachaCard = (row: GachaCardRow): GachaCard => ({
  id: row.id,
  course_id: row.course_id,
  title: row.title,
  image_url: row.image_url,
  rarity: row.rarity,
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
  image_transform: parseGachaImageTransform(row.image_transform),
});
