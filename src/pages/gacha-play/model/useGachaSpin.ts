import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/providers/auth/useAuth';
import { getGachaCardsByCourse } from '@/entities/gacha-card/api/getGachaCardsByCourse';
import type { SpinGachaCardDrop, SpinGachaResult } from '@/entities/gacha/model/types';
import { spinGacha } from '@/features/gacha/api/spinGacha';
import { isGachaTestSpinEnabled } from '@/pages/gacha-play/model/gachaTestSpinFlag';
import { createRewardsFromSpinCards, pickRandomGachaRewards, type GachaReward } from '@/pages/gacha-play/model/gachaReward';
import {
  loadDroppedGachaCardImages,
  mergeDroppedCardImages,
  type DroppedCardImagesResult,
} from '@/pages/gacha-play/model/loadDroppedGachaCardImages';
import { useGachaMachinePlayback } from '@/pages/gacha-play/model/useGachaMachinePlayback';

type GachaSpinStatus = 'idle' | 'preparing' | 'playing' | 'rewards' | 'reconciling' | 'error';

type SpinKind = 'test' | 'real';

type PendingSpin = {
  requestId: number;
  courseId: string;
  userId: string;
  kind: SpinKind;
  rewards: GachaReward[];
  imageError: string;
  droppedCards: readonly SpinGachaCardDrop[] | null;
};

type RewardView = {
  requestId: number;
  courseId: string;
  userId: string;
  rewards: GachaReward[];
  imageError: string;
  droppedCards: readonly SpinGachaCardDrop[] | null;
};

type SpinFailure = {
  courseId: string;
  userId: string;
  source: 'test' | 'real';
  message: string;
};

type SpinScope = {
  courseId: string | undefined;
  userId: string | undefined;
};

type GachaSpinHandlers = {
  onSpinCommitted: (courseId: string, result: SpinGachaResult) => void;
  onSpinOutcomeUnknown: (courseId: string) => Promise<void>;
};

const isSpinBlocked = (status: GachaSpinStatus) =>
  status === 'preparing' ||
  status === 'playing' ||
  status === 'rewards' ||
  status === 'reconciling';

const formatUnknownSpinOutcome = (error: unknown) => {
  const details = error instanceof Error ? error.message.trim() : '';
  const caveat =
    'Повторный запрос не отправлялся. Сверьте число круток: попытка могла уже быть списана.';

  return details.length > 0
    ? `${details} ${caveat}`
    : `Не удалось получить результат крутки. ${caveat}`;
};

const imageRetryFallback =
  'Не удалось загрузить изображения. Изображения можно загрузить ещё раз без новой крутки.';

export const useGachaSpin = (courseId: string | undefined, handlers: GachaSpinHandlers) => {
  const { user } = useAuth();
  const userId = user?.id;
  const handlersRef = useRef(handlers);
  const statusRef = useRef<GachaSpinStatus>('idle');
  const requestIdRef = useRef(0);
  const courseIdRef = useRef(courseId);
  const userIdRef = useRef(userId);
  const pendingRef = useRef<PendingSpin | null>(null);
  const rewardViewRef = useRef<RewardView | null>(null);
  const rpcGuardRef = useRef(false);
  const retryGuardRef = useRef(false);
  const clearPlayerErrorRef = useRef<() => void>(() => {});
  const [scope, setScope] = useState<SpinScope>({ courseId, userId });
  const [status, setStatus] = useState<GachaSpinStatus>('idle');
  const [rewardView, setRewardView] = useState<RewardView | null>(null);
  const [failure, setFailure] = useState<SpinFailure | null>(null);
  const [isRetryingImages, setIsRetryingImages] = useState(false);
  const scopeChanged = scope.courseId !== courseId || scope.userId !== userId;

  useLayoutEffect(() => {
    handlersRef.current = handlers;
  });

  if (scopeChanged) {
    setScope({ courseId, userId });
    setStatus('idle');
    setRewardView(null);
    setFailure(null);
    setIsRetryingImages(false);
  }

  const displayedStatus: GachaSpinStatus = scopeChanged ? 'idle' : status;
  const displayedRewardView =
    !scopeChanged &&
    displayedStatus === 'rewards' &&
    rewardView &&
    rewardView.courseId === courseId &&
    rewardView.userId === userId
      ? rewardView
      : null;
  const displayedFailure =
    !scopeChanged && failure && failure.courseId === courseId && failure.userId === userId
      ? failure
      : null;

  const isCurrentRequest = useCallback(
    (requestId: number, targetCourseId: string, targetUserId: string) =>
      requestId === requestIdRef.current &&
      courseIdRef.current === targetCourseId &&
      userIdRef.current === targetUserId,
    [],
  );

  const openRewardView = useCallback(
    (pending: PendingSpin) => {
      pendingRef.current = null;
      statusRef.current = 'rewards';
      const nextView: RewardView = {
        requestId: pending.requestId,
        courseId: pending.courseId,
        userId: pending.userId,
        rewards: pending.rewards,
        imageError: pending.imageError,
        droppedCards: pending.droppedCards,
      };
      rewardViewRef.current = nextView;
      clearPlayerErrorRef.current();
      setRewardView(nextView);
      setStatus('rewards');
    },
    [],
  );

  const publishLoadedImages = useCallback(
    (
      requestId: number,
      targetCourseId: string,
      targetUserId: string,
      loaded: DroppedCardImagesResult,
    ) => {
      if (!isCurrentRequest(requestId, targetCourseId, targetUserId)) {
        return;
      }

      const pending = pendingRef.current;

      if (pending?.requestId === requestId && pending.droppedCards) {
        pending.rewards = mergeDroppedCardImages(pending.rewards, pending.droppedCards, loaded);
        pending.imageError = loaded.errorMessage;
      }

      setRewardView((current) => {
        if (
          !isCurrentRequest(requestId, targetCourseId, targetUserId) ||
          !current ||
          current.requestId !== requestId ||
          !current.droppedCards
        ) {
          return current;
        }

        const nextView: RewardView = {
          ...current,
          rewards: mergeDroppedCardImages(current.rewards, current.droppedCards, loaded),
          imageError: loaded.errorMessage,
        };
        return nextView;
      });
    },
    [isCurrentRequest],
  );

  const handlePlaybackComplete = useCallback(() => {
    const pending = pendingRef.current;

    if (
      statusRef.current !== 'playing' ||
      !pending ||
      pending.requestId !== requestIdRef.current ||
      pending.courseId !== courseIdRef.current ||
      pending.userId !== userIdRef.current
    ) {
      return;
    }

    if (pending.kind === 'test' && pending.rewards.length === 0) {
      return;
    }

    openRewardView(pending);
  }, [openRewardView]);

  const handlePlaybackInterrupt = useCallback(() => {
    const pending = pendingRef.current;

    if (!pending || (statusRef.current !== 'preparing' && statusRef.current !== 'playing')) {
      return;
    }

    if (
      pending.requestId !== requestIdRef.current ||
      pending.courseId !== courseIdRef.current ||
      pending.userId !== userIdRef.current
    ) {
      return;
    }

    if (pending.kind === 'real') {
      openRewardView(pending);
      return;
    }

    pendingRef.current = null;
    statusRef.current = 'error';
    rewardViewRef.current = null;
    setRewardView(null);
    setStatus('error');
  }, [openRewardView]);

  const {
    isLottieReady,
    isPlaying,
    playerError,
    playFromStart,
    resetToStart,
    clearPlayerError,
    dotLottieRefCallback,
  } = useGachaMachinePlayback({
    onComplete: handlePlaybackComplete,
    onInterrupt: handlePlaybackInterrupt,
  });

  useLayoutEffect(() => {
    clearPlayerErrorRef.current = clearPlayerError;
  }, [clearPlayerError]);

  useLayoutEffect(() => {
    courseIdRef.current = courseId;
    userIdRef.current = userId;
    requestIdRef.current += 1;
    pendingRef.current = null;
    rewardViewRef.current = null;
    statusRef.current = 'idle';
    rpcGuardRef.current = false;
    retryGuardRef.current = false;
    resetToStart();

    return () => {
      requestIdRef.current += 1;
      pendingRef.current = null;
      rpcGuardRef.current = false;
      retryGuardRef.current = false;
    };
  }, [courseId, resetToStart, userId]);

  useLayoutEffect(() => {
    if (
      rewardView &&
      rewardView.courseId === courseId &&
      rewardView.userId === userId &&
      statusRef.current === 'rewards'
    ) {
      rewardViewRef.current = rewardView;
      return;
    }

    if (statusRef.current !== 'rewards') {
      rewardViewRef.current = null;
    }
  }, [courseId, rewardView, userId]);

  const beginSpin = useCallback(() => {
    if (isSpinBlocked(statusRef.current)) {
      return null;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    pendingRef.current = null;
    rewardViewRef.current = null;
    statusRef.current = 'preparing';
    setStatus('preparing');
    setFailure(null);
    setRewardView(null);
    setIsRetryingImages(false);

    return requestId;
  }, []);

  const startTestSpin = useCallback(async () => {
    if (!isGachaTestSpinEnabled || rpcGuardRef.current) {
      return;
    }

    const targetCourseId = courseIdRef.current;
    const targetUserId = userIdRef.current;

    if (!targetCourseId || !targetUserId) {
      return;
    }

    const requestId = beginSpin();

    if (requestId === null) {
      return;
    }

    const isCurrent = () => isCurrentRequest(requestId, targetCourseId, targetUserId);

    try {
      const cards = await getGachaCardsByCourse(targetCourseId);

      if (!isCurrent()) {
        return;
      }

      const rewards = pickRandomGachaRewards(cards);
      pendingRef.current = {
        requestId,
        courseId: targetCourseId,
        userId: targetUserId,
        kind: 'test',
        rewards,
        imageError: '',
        droppedCards: null,
      };
      const started = playFromStart();

      if (!isCurrent()) {
        pendingRef.current = null;
        resetToStart();
        return;
      }

      if (!started || statusRef.current === 'error') {
        pendingRef.current = null;

        if (statusRef.current !== 'error') {
          statusRef.current = 'error';
          setStatus('error');
        }

        return;
      }

      statusRef.current = 'playing';
      setStatus('playing');
    } catch (error) {
      if (!isCurrent()) {
        return;
      }

      pendingRef.current = null;
      statusRef.current = 'error';
      setStatus('error');
      setFailure({
        courseId: targetCourseId,
        userId: targetUserId,
        source: 'test',
        message: error instanceof Error ? error.message : 'Не удалось загрузить карты',
      });
    }
  }, [beginSpin, isCurrentRequest, playFromStart, resetToStart]);

  const startRealSpin = useCallback(async () => {
    if (!isLottieReady || rpcGuardRef.current) {
      return;
    }

    const targetCourseId = courseIdRef.current;
    const targetUserId = userIdRef.current;

    if (!targetCourseId || !targetUserId) {
      return;
    }

    const requestId = beginSpin();

    if (requestId === null) {
      return;
    }

    rpcGuardRef.current = true;
    const isCurrent = () => isCurrentRequest(requestId, targetCourseId, targetUserId);

    let result: SpinGachaResult;

    try {
      result = await spinGacha(targetCourseId);
    } catch (error) {
      if (!isCurrent()) {
        return;
      }

      pendingRef.current = null;
      statusRef.current = 'reconciling';
      setStatus('reconciling');
      setRewardView(null);
      setFailure({
        courseId: targetCourseId,
        userId: targetUserId,
        source: 'real',
        message: formatUnknownSpinOutcome(error),
      });

      try {
        await handlersRef.current.onSpinOutcomeUnknown(targetCourseId);
      } catch {
        // The overview hook surfaces its own reload error. Do not spin again.
      }

      if (!isCurrent()) {
        return;
      }

      statusRef.current = 'error';
      setStatus('error');
      rpcGuardRef.current = false;
      return;
    }

    if (!isCurrent()) {
      return;
    }

    try {
      const droppedCards = [...result.cards].sort(
        (left, right) => left.drop_number - right.drop_number,
      );
      const rewards = createRewardsFromSpinCards(droppedCards);
      const pending: PendingSpin = {
        requestId,
        courseId: targetCourseId,
        userId: targetUserId,
        kind: 'real',
        rewards,
        imageError: '',
        droppedCards,
      };
      pendingRef.current = pending;
      handlersRef.current.onSpinCommitted(targetCourseId, result);

      void loadDroppedGachaCardImages(droppedCards)
        .then((loaded) => {
          publishLoadedImages(requestId, targetCourseId, targetUserId, loaded);
        })
        .catch(() => {
          publishLoadedImages(requestId, targetCourseId, targetUserId, {
            signedUrls: null,
            transforms: null,
            errorMessage: imageRetryFallback,
          });
        });

      if (!isCurrent()) {
        return;
      }

      const started = playFromStart();

      if (!isCurrent()) {
        pendingRef.current = null;
        resetToStart();
        return;
      }

      if (statusRef.current === 'rewards') {
        return;
      }

      if (!started) {
        openRewardView(pendingRef.current ?? pending);
        return;
      }

      statusRef.current = 'playing';
      setStatus('playing');
    } catch {
      if (!isCurrent() || statusRef.current === 'rewards') {
        return;
      }

      const saved = pendingRef.current;

      if (saved?.requestId === requestId) {
        openRewardView(saved);
        return;
      }

      const droppedCards = [...result.cards].sort(
        (left, right) => left.drop_number - right.drop_number,
      );
      openRewardView({
        requestId,
        courseId: targetCourseId,
        userId: targetUserId,
        kind: 'real',
        rewards: createRewardsFromSpinCards(droppedCards),
        imageError: imageRetryFallback,
        droppedCards,
      });
    }
  }, [
    beginSpin,
    isCurrentRequest,
    isLottieReady,
    openRewardView,
    playFromStart,
    publishLoadedImages,
    resetToStart,
  ]);

  const retryRewardImages = useCallback(async () => {
    if (retryGuardRef.current) {
      return;
    }

    const current = rewardViewRef.current;

    if (
      statusRef.current !== 'rewards' ||
      !current?.droppedCards ||
      current.droppedCards.length === 0 ||
      current.courseId !== courseIdRef.current ||
      current.userId !== userIdRef.current
    ) {
      return;
    }

    const requestId = current.requestId;
    const targetCourseId = current.courseId;
    const targetUserId = current.userId;
    const cards = current.droppedCards;
    retryGuardRef.current = true;
    setIsRetryingImages(true);

    try {
      const loaded = await loadDroppedGachaCardImages(cards);

      if (!isCurrentRequest(requestId, targetCourseId, targetUserId)) {
        return;
      }

      publishLoadedImages(requestId, targetCourseId, targetUserId, loaded);
    } catch {
      if (!isCurrentRequest(requestId, targetCourseId, targetUserId)) {
        return;
      }

      publishLoadedImages(requestId, targetCourseId, targetUserId, {
        signedUrls: null,
        transforms: null,
        errorMessage: imageRetryFallback,
      });
    } finally {
      if (requestId === requestIdRef.current) {
        retryGuardRef.current = false;
        setIsRetryingImages(false);
      }
    }
  }, [isCurrentRequest, publishLoadedImages]);

  const closeRewards = useCallback(() => {
    requestIdRef.current += 1;
    pendingRef.current = null;
    rewardViewRef.current = null;
    statusRef.current = 'idle';
    rpcGuardRef.current = false;
    retryGuardRef.current = false;
    setStatus('idle');
    setRewardView(null);
    setFailure(null);
    setIsRetryingImages(false);
    resetToStart();
  }, [resetToStart]);

  const isBusy = isSpinBlocked(displayedStatus) || isPlaying;

  return {
    rewards: displayedRewardView?.rewards ?? null,
    imageError: displayedRewardView?.imageError ?? '',
    canRetryImages: Boolean(displayedRewardView?.droppedCards?.length),
    isRetryingImages: scopeChanged ? false : isRetryingImages,
    realSpinError: displayedFailure?.source === 'real' ? displayedFailure.message : '',
    testSpinError: displayedFailure?.source === 'test' ? displayedFailure.message : '',
    playerError: isBusy || displayedFailure ? '' : playerError,
    isBusy,
    isLottieReady,
    dotLottieRefCallback,
    startTestSpin,
    startRealSpin,
    retryRewardImages,
    closeRewards,
  };
};
