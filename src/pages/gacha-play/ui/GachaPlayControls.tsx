type GachaPlayControlsProps = {
  availablePulls: number;
  remainingCards: number;
  totalCards: number;
  isLoading: boolean;
  errorMessage: string;
  playerError: string;
  isSpinBusy: boolean;
  canRealSpin: boolean;
  onRealSpin: () => void;
  realSpinError: string;
  showTestSpin: boolean;
  onTestSpin: () => void;
  testSpinError: string;
};

export const GachaPlayControls = ({
  availablePulls,
  remainingCards,
  totalCards,
  isLoading,
  errorMessage,
  playerError,
  isSpinBusy,
  canRealSpin,
  onRealSpin,
  realSpinError,
  showTestSpin,
  onTestSpin,
  testSpinError,
}: GachaPlayControlsProps) => {
  const hint =
    isLoading || errorMessage !== ''
      ? ''
      : totalCards === 0
        ? 'У этого курса пока нет гача-карт.'
        : availablePulls === 0
          ? 'Сейчас нет доступных круток.'
          : '';

  return (
    <section
      aria-label="Управление гачей"
      className="rounded-3xl border border-white/80 bg-white/80 p-4 text-text-primary shadow-[0_12px_32px_rgba(62,32,18,0.16)] backdrop-blur-md"
    >
      {isLoading ? (
        <p className="text-sm text-text-secondary">Загрузка...</p>
      ) : errorMessage ? (
        <p className="text-sm text-accent">{errorMessage}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-text-secondary">Доступно круток</p>
            <p className="text-xl font-bold tabular-nums">{availablePulls}</p>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-text-secondary">Осталось открыть карт</p>
            <p className="text-xl font-bold tabular-nums">{remainingCards}</p>
          </div>
        </div>
      )}

      {hint ? <p className="mt-3 text-sm text-text-secondary">{hint}</p> : null}

      <button
        type="button"
        onClick={onRealSpin}
        disabled={!canRealSpin}
        aria-busy={isSpinBusy}
        className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Крутить
      </button>

      {realSpinError ? <p className="mt-3 text-sm text-accent">{realSpinError}</p> : null}

      {import.meta.env.DEV &&
      import.meta.env.VITE_ENABLE_GACHA_TEST_SPIN === 'true' &&
      showTestSpin ? (
        <button
          type="button"
          onClick={onTestSpin}
          disabled={isSpinBusy}
          aria-busy={isSpinBusy}
          className="mt-3 w-full rounded-2xl border border-primary bg-white px-4 py-3 font-medium text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Тестовая крутка
        </button>
      ) : null}

      {import.meta.env.DEV &&
      import.meta.env.VITE_ENABLE_GACHA_TEST_SPIN === 'true' &&
      testSpinError ? (
        <p className="mt-3 text-sm text-accent">{testSpinError}</p>
      ) : null}

      {playerError ? <p className="mt-3 text-sm text-accent">{playerError}</p> : null}
    </section>
  );
};
