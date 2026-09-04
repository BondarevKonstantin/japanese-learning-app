import { supabase } from '@/shared/api/supabase/client';
import type { GachaCard, GachaCardRarity } from '@/entities/gacha-card/model/types';

type UpdateGachaCardRarityParams = {
  cardId: string;
  rarity: GachaCardRarity;
};

export const updateGachaCardRarity = async ({
  cardId,
  rarity,
}: UpdateGachaCardRarityParams): Promise<GachaCard> => {
  const { data, error } = await supabase
    .from('gacha_cards')
    .update({
      rarity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
