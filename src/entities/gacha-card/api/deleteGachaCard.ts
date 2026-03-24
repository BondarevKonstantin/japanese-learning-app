import { supabase } from '@/shared/api/supabase/client';

export const deleteGachaCard = async (cardId: string) => {
  const { error } = await supabase.from('gacha_cards').delete().eq('id', cardId);

  if (error) {
    throw error;
  }
};
