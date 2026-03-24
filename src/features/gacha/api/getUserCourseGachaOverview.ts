import { supabase } from '@/shared/api/supabase/client';

export type UserCourseGachaOverview = {
  availablePulls: number;
  usedPulls: number;
  totalPullsEarned: number;
  unlockedCount: number;
  totalCards: number;
  completed: boolean;
};

export async function getUserCourseGachaOverview(
  courseId: string,
  userId: string,
): Promise<UserCourseGachaOverview> {
  const [
    { data: state, error: stateError },
    { count: unlockedCount, error: unlockedError },
    { count: totalCards, error: totalError },
  ] = await Promise.all([
    supabase
      .from('user_course_gacha_state')
      .select('available_pulls, used_pulls, total_pulls_earned')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('user_unlocked_cards')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('user_id', userId),

    supabase
      .from('gacha_cards')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId),
  ]);

  if (stateError) {
    throw new Error(stateError.message);
  }

  if (unlockedError) {
    throw new Error(unlockedError.message);
  }

  if (totalError) {
    throw new Error(totalError.message);
  }

  const availablePulls = state?.available_pulls ?? 0;
  const usedPulls = state?.used_pulls ?? 0;
  const totalPullsEarned = state?.total_pulls_earned ?? 0;
  const safeUnlockedCount = unlockedCount ?? 0;
  const safeTotalCards = totalCards ?? 0;

  return {
    availablePulls,
    usedPulls,
    totalPullsEarned,
    unlockedCount: safeUnlockedCount,
    totalCards: safeTotalCards,
    completed: safeTotalCards > 0 && safeUnlockedCount >= safeTotalCards,
  };
}
