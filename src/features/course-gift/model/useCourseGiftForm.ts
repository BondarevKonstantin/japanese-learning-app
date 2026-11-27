import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/providers/auth/useAuth';
import { getMyCourseGift } from '@/entities/course-gift/api/getMyCourseGift';
import { saveCourseGiftClaim } from '@/entities/course-gift/api/saveCourseGiftClaim';
import {
  COURSE_GIFT_ADDRESS_MAX_LENGTH,
  courseGiftAddressTooLongMessage,
  type CourseGiftState,
  type CourseGiftStatus,
} from '@/entities/course-gift/model/types';
import {
  addressDraftFromGiftState,
  canDeclineCourseGift,
  canSubmitCourseGiftAddress,
  createPreviewGiftState,
  getCourseGiftAddressError,
  getCourseGiftBlockedMessage,
  getCourseGiftStatusMessage,
  type CourseGiftFormMode,
} from '@/features/course-gift/model/courseGiftForm';

type LoadStatus = 'loading' | 'error' | 'ready';

type RequestScope = {
  courseId: string;
  userId: string;
  mode: CourseGiftFormMode;
};

type GiftScope = {
  courseId: string;
  userId: string | null;
  mode: CourseGiftFormMode;
  isPreview: boolean;
};

export type CourseGiftFormModel = {
  loadStatus: LoadStatus;
  loadError: string | null;
  giftState: CourseGiftState | null;
  address: string;
  fieldError: string | null;
  isSaving: boolean;
  pendingAction: CourseGiftStatus | null;
  canSubmitAddress: boolean;
  canDecline: boolean;
  blockedMessage: string | null;
  statusMessage: string | null;
  updateAddress: (value: string) => void;
  reload: () => void;
  submitAddress: () => void;
  declineGift: () => void;
};

type UseCourseGiftFormParams = {
  courseId: string;
  mode?: CourseGiftFormMode;
  onSaved: (state: CourseGiftState) => void;
};

const readErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const saveFailureMessage = (status: CourseGiftStatus) => {
  return status === 'declined'
    ? 'Не удалось сохранить отказ. Попробуй ещё раз.'
    : 'Не удалось сохранить решение. Попробуй ещё раз.';
};

const matchesGiftScope = (scope: GiftScope, target: RequestScope) => {
  return (
    !scope.isPreview &&
    scope.mode === target.mode &&
    scope.courseId === target.courseId &&
    scope.userId === target.userId
  );
};

export const useCourseGiftForm = ({
  courseId,
  mode = 'student',
  onSaved,
}: UseCourseGiftFormParams): CourseGiftFormModel => {
  const { user, isLoading } = useAuth();
  const isPreview = mode === 'teacher-preview';
  const userId = user?.id ?? null;
  const isSessionLoading = isLoading && !user;
  const scopeId = `${isPreview ? 'preview' : 'live'}:${userId ?? ''}:${courseId}`;
  const [activeScope, setActiveScope] = useState(scopeId);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(isPreview ? 'ready' : 'loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [giftState, setGiftState] = useState<CourseGiftState | null>(
    isPreview ? createPreviewGiftState() : null,
  );
  const [address, setAddress] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<CourseGiftStatus | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadRequestRef = useRef(0);
  const saveRequestRef = useRef(0);
  const saveGuardRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  const scopeRef = useRef<GiftScope>({ courseId, userId, mode, isPreview });

  if (activeScope !== scopeId) {
    setActiveScope(scopeId);
    setLoadStatus(isPreview ? 'ready' : 'loading');
    setLoadError(null);
    setGiftState(isPreview ? createPreviewGiftState() : null);
    setAddress('');
    setSaveError(null);
    setPendingAction(null);
  }

  useLayoutEffect(() => {
    onSavedRef.current = onSaved;
    scopeRef.current = { courseId, userId, mode, isPreview };
  });

  useLayoutEffect(() => {
    saveGuardRef.current = false;

    return () => {
      loadRequestRef.current += 1;
      saveRequestRef.current += 1;
      saveGuardRef.current = false;
    };
  }, [scopeId]);

  useEffect(() => {
    if (isPreview || isSessionLoading) {
      return;
    }

    const requestId = ++loadRequestRef.current;
    const targetUserId = userId;
    let ignore = false;

    const loadGift = async () => {
      const isCurrentLoad = (target?: RequestScope) => {
        if (ignore || requestId !== loadRequestRef.current || saveGuardRef.current) {
          return false;
        }

        if (!target) {
          return true;
        }

        return matchesGiftScope(scopeRef.current, target);
      };

      if (!courseId.trim() || !targetUserId) {
        if (!isCurrentLoad()) {
          return;
        }

        setLoadStatus('error');
        setLoadError(courseId.trim() ? 'Нужно войти, чтобы получить подарок.' : 'Курс не найден.');
        setGiftState(null);
        return;
      }

      const target = { courseId, userId: targetUserId, mode };

      try {
        const next = await getMyCourseGift(courseId);

        if (!isCurrentLoad(target)) {
          return;
        }

        setGiftState(next);
        setAddress(addressDraftFromGiftState(next));
        setSaveError(null);
        setLoadStatus('ready');
      } catch (error: unknown) {
        if (!isCurrentLoad(target)) {
          return;
        }

        console.error('Failed to load course gift');
        setGiftState(null);
        setLoadStatus('error');
        setLoadError(readErrorMessage(error, 'Не удалось загрузить данные подарка.'));
      }
    };

    void loadGift();

    return () => {
      ignore = true;
    };
  }, [courseId, isPreview, isSessionLoading, mode, reloadKey, userId]);

  const canSubmitAddress = giftState !== null && canSubmitCourseGiftAddress(giftState);
  const canDecline = giftState !== null && canDeclineCourseGift(giftState);
  const lengthError =
    canSubmitAddress && address.trim().length > COURSE_GIFT_ADDRESS_MAX_LENGTH
      ? courseGiftAddressTooLongMessage
      : null;
  const isSaving = pendingAction !== null;

  const updateAddress = (value: string) => {
    if (saveGuardRef.current) {
      return;
    }

    setAddress(value);
    setSaveError(null);
  };

  const reload = () => {
    if (isPreview || saveGuardRef.current || isSessionLoading) {
      return;
    }

    setLoadStatus('loading');
    setLoadError(null);
    setGiftState(null);
    setReloadKey((current) => current + 1);
  };

  const applyPreviewState = (next: CourseGiftState) => {
    setGiftState(next);
    setAddress(addressDraftFromGiftState(next));
    setSaveError(null);
  };

  const persist = async (status: CourseGiftStatus, shippingAddress: string | null) => {
    if (saveGuardRef.current || isPreview || !userId || !courseId.trim()) {
      return;
    }

    saveGuardRef.current = true;
    setPendingAction(status);
    setSaveError(null);

    const requestId = ++saveRequestRef.current;
    loadRequestRef.current += 1;
    const target = { courseId, userId, mode };

    try {
      const next = await saveCourseGiftClaim({
        courseId,
        status,
        shippingAddress,
      });

      if (requestId !== saveRequestRef.current || !matchesGiftScope(scopeRef.current, target)) {
        return;
      }

      setGiftState(next);
      setAddress(addressDraftFromGiftState(next));
      setPendingAction(null);
      saveGuardRef.current = false;
      onSavedRef.current(next);
    } catch {
      if (requestId !== saveRequestRef.current || !matchesGiftScope(scopeRef.current, target)) {
        return;
      }

      setPendingAction(null);
      saveGuardRef.current = false;
      setSaveError(saveFailureMessage(status));
    }
  };

  const submitAddress = () => {
    if (saveGuardRef.current || loadStatus !== 'ready' || !giftState || !canSubmitAddress) {
      return;
    }

    const addressError = getCourseGiftAddressError(address);

    if (addressError) {
      setSaveError(addressError);
      return;
    }

    const trimmed = address.trim();

    if (isPreview) {
      applyPreviewState({
        enabled: giftState.enabled,
        eligible: giftState.eligible,
        status: 'requested',
        shipping_address: trimmed,
        updated_at: null,
      });
      return;
    }

    void persist('requested', trimmed);
  };

  const declineGift = () => {
    if (saveGuardRef.current || loadStatus !== 'ready' || !giftState || !canDecline) {
      return;
    }

    if (isPreview) {
      applyPreviewState({
        enabled: giftState.enabled,
        eligible: giftState.eligible,
        status: 'declined',
        shipping_address: null,
        updated_at: null,
      });
      return;
    }

    void persist('declined', null);
  };

  return {
    loadStatus: isPreview ? 'ready' : loadStatus,
    loadError: isPreview ? null : loadError,
    giftState,
    address,
    fieldError: saveError ?? lengthError,
    isSaving,
    pendingAction,
    canSubmitAddress,
    canDecline,
    blockedMessage: giftState ? getCourseGiftBlockedMessage(giftState) : null,
    statusMessage: giftState ? getCourseGiftStatusMessage(giftState) : null,
    updateAddress,
    reload,
    submitAddress,
    declineGift,
  };
};
