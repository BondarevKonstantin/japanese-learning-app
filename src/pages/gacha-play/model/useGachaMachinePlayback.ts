import { useCallback, useRef, useState } from 'react';
import type { DotLottie, EventListener } from '@lottiefiles/dotlottie-react';

const playbackErrorMessage = 'Не удалось запустить анимацию';

type GachaMachinePlaybackHandlers = {
  onComplete?: () => void;
  onInterrupt?: () => void;
};

export const useGachaMachinePlayback = ({
  onComplete,
  onInterrupt,
}: GachaMachinePlaybackHandlers = {}) => {
  const playerRef = useRef<DotLottie | null>(null);
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLottieReady, setIsLottieReady] = useState(false);
  const [playerError, setPlayerError] = useState('');

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const handleComplete = useCallback(() => {
    stopPlayback();
    onComplete?.();
  }, [onComplete, stopPlayback]);

  const handleLoad = useCallback(() => {
    setIsLottieReady(true);
  }, []);

  const handleLoadError = useCallback<EventListener<'loadError'>>(
    (event) => {
      setIsLottieReady(false);
      stopPlayback();
      setPlayerError(event.error.message || 'Не удалось загрузить анимацию');
      onInterrupt?.();
    },
    [onInterrupt, stopPlayback],
  );

  const handleRenderError = useCallback<EventListener<'renderError'>>(
    (event) => {
      stopPlayback();
      setPlayerError(event.error.message || playbackErrorMessage);
      onInterrupt?.();
    },
    [onInterrupt, stopPlayback],
  );

  const dotLottieRefCallback = useCallback(
    (player: DotLottie | null) => {
      const previous = playerRef.current;

      if (previous && previous !== player) {
        previous.removeEventListener('complete', handleComplete);
        previous.removeEventListener('load', handleLoad);
        previous.removeEventListener('loadError', handleLoadError);
        previous.removeEventListener('renderError', handleRenderError);
      }

      playerRef.current = player;

      if (player && player !== previous) {
        player.addEventListener('complete', handleComplete);
        player.addEventListener('load', handleLoad);
        player.addEventListener('loadError', handleLoadError);
        player.addEventListener('renderError', handleRenderError);
      }

      if (!player) {
        setIsLottieReady(false);
        stopPlayback();
        return;
      }

      setIsLottieReady(player.isLoaded);
    },
    [handleComplete, handleLoad, handleLoadError, handleRenderError, stopPlayback],
  );

  const playFromStart = useCallback(() => {
    if (isPlayingRef.current) {
      return false;
    }

    const player = playerRef.current;

    if (!player || !player.isLoaded) {
      setPlayerError('Автомат ещё не готов. Попробуйте ещё раз.');
      return false;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    setPlayerError('');

    try {
      player.stop();
      player.play();
    } catch (error) {
      stopPlayback();
      setPlayerError(error instanceof Error ? error.message : playbackErrorMessage);
      onInterrupt?.();
      return false;
    }

    if (!player.isPlaying) {
      stopPlayback();
      setPlayerError(playbackErrorMessage);
      onInterrupt?.();
      return false;
    }

    return true;
  }, [onInterrupt, stopPlayback]);

  const clearPlayerError = useCallback(() => {
    setPlayerError('');
  }, []);

  const resetToStart = useCallback(() => {
    stopPlayback();
    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      if (!player.isLoaded) {
        return;
      }

      player.stop();

      if (player.currentFrame !== 0) {
        player.setFrame(0);
      }
    } catch {
      // Closing the reward screen must still succeed if the player cannot reset.
    }
  }, [stopPlayback]);

  return {
    isLottieReady,
    isPlaying,
    playerError,
    playFromStart,
    resetToStart,
    clearPlayerError,
    dotLottieRefCallback,
  };
};
