import { mapGachaCardDescription } from '@/entities/gacha-card/lib/mapGachaCardDescription';
import type { GachaCardDescription } from '@/entities/gacha-card/model/types';
import { supabase } from '@/shared/api/supabase/client';

type SaveGachaCardDescriptionParams = {
  cardId: string;
  description: string;
};

export const saveGachaCardDescription = async ({
  cardId,
  description,
}: SaveGachaCardDescriptionParams): Promise<GachaCardDescription> => {
  const trimmedDescription = description.trim();

  if (trimmedDescription.length === 0) {
    throw new Error('Укажите описание');
  }

  const { data, error } = await supabase
    .from('gacha_card_descriptions')
    .upsert(
      {
        card_id: cardId,
        description: trimmedDescription,
      },
      { onConflict: 'card_id' },
    )
    .select('card_id, description')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapGachaCardDescription(data);
};
