import { supabase } from '@/shared/api/supabase/client';

export const deleteLessonPracticeItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase.from('lesson_practice_items').delete().eq('id', itemId);

  if (error) {
    throw new Error(error.message);
  }
};
