import { useMemo, useState } from 'react';
import type { LessonPracticeItem } from '@/entities/lesson-practice/model/types';

type Props = {
  items: LessonPracticeItem[];
  answers: Record<string, string>;
  onAnswersChange: (value: Record<string, string>) => void;
  isReadonly?: boolean;
};

type CheckResult = {
  total: number;
  correct: number;
};

const normalizeValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const getAcceptedAnswers = (item: LessonPracticeItem): string[] => {
  if (item.type === 'textarea') {
    return [];
  }

  if (Array.isArray(item.correct_answer)) {
    return item.correct_answer.map(normalizeValue).filter(Boolean);
  }

  if (item.type === 'input') {
    return item.correct_answer.split(/[;；]/).map(normalizeValue).filter(Boolean);
  }

  return [normalizeValue(item.correct_answer)];
};

const getDisplayCorrectAnswer = (item: LessonPracticeItem): string => {
  if (Array.isArray(item.correct_answer)) {
    return item.correct_answer.join('; ');
  }

  return item.correct_answer;
};

export const LessonPracticeBlock = ({
  items,
  answers,
  onAnswersChange,
  isReadonly = false,
}: Props) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleInputChange = (itemId: string, value: string) => {
    if (isReadonly) {
      return;
    }

    onAnswersChange({
      ...answers,
      [itemId]: value,
    });
  };

  const checkResult = useMemo<CheckResult | null>(() => {
    if (!isChecked) {
      return null;
    }

    const autoCheckItems = items.filter((item) => item.type !== 'textarea');

    let correct = 0;

    for (const item of autoCheckItems) {
      const userAnswer = normalizeValue(answers[item.id] ?? '');
      const acceptedAnswers = getAcceptedAnswers(item);

      if (acceptedAnswers.includes(userAnswer)) {
        correct += 1;
      }
    }

    return {
      total: autoCheckItems.length,
      correct,
    };
  }, [answers, isChecked, items]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-center">
        <p className="text-text-primary">Для этого урока пока нет практики.</p>
        <p className="mt-2 text-sm text-text-secondary">
          Когда преподаватель добавит задания, они появятся здесь.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => {
        const userAnswer = answers[item.id] ?? '';
        const acceptedAnswers = getAcceptedAnswers(item);
        const displayCorrectAnswer = getDisplayCorrectAnswer(item);
        const normalizedUserAnswer = normalizeValue(userAnswer);
        const isTextarea = item.type === 'textarea';

        const isCorrect =
          !isTextarea && isChecked && acceptedAnswers.includes(normalizedUserAnswer);

        const isWrong =
          !isTextarea &&
          isChecked &&
          userAnswer.trim().length > 0 &&
          !acceptedAnswers.includes(normalizedUserAnswer);

        return (
          <div key={item.id} className="rounded-3xl border border-border bg-background p-5">
            <p className="text-sm text-text-secondary">Задание {index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">{item.question}</h3>

            {item.image_url ? (
              <div className="mt-4">
                <img
                  src={item.image_url}
                  alt={`Иллюстрация к заданию ${index + 1}`}
                  className="max-h-[360px] w-full max-w-2xl rounded-2xl border border-border object-contain"
                />
              </div>
            ) : null}

            {item.type === 'multiple_choice' && item.options?.length ? (
              <div className="mt-4 grid gap-3">
                {item.options.map((option) => {
                  const isSelected = userAnswer === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleInputChange(item.id, option)}
                      disabled={isReadonly}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary-light text-text-primary'
                          : 'border-border bg-surface text-text-primary hover:bg-background'
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : item.type === 'textarea' ? (
              <div className="mt-4">
                <textarea
                  value={userAnswer}
                  onChange={(event) => handleInputChange(item.id, event.target.value)}
                  rows={6}
                  disabled={isReadonly}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Введите развёрнутый ответ"
                />
              </div>
            ) : (
              <div className="mt-4">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(event) => handleInputChange(item.id, event.target.value)}
                  disabled={isReadonly}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Введите ответ"
                />
              </div>
            )}

            {isChecked ? (
              <div className="mt-4">
                <p
                  className={`text-sm font-medium ${
                    isTextarea
                      ? 'text-text-secondary'
                      : isCorrect
                        ? 'text-primary'
                        : isWrong
                          ? 'text-accent'
                          : 'text-text-secondary'
                  }`}
                >
                  {isTextarea
                    ? 'Этот ответ будет проверен учителем'
                    : isCorrect
                      ? 'Верно'
                      : isWrong
                        ? `Неверно. Правильный ответ: ${displayCorrectAnswer}`
                        : `Правильный ответ: ${displayCorrectAnswer}`}
                </p>

                {item.explanation ? (
                  <p className="mt-2 text-sm text-text-secondary">Пояснение: {item.explanation}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsChecked(true)}
            className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90"
          >
            Проверить ответы
          </button>

          <button
            type="button"
            onClick={() => {
              onAnswersChange({});
              setIsChecked(false);
            }}
            disabled={isReadonly}
            className="rounded-2xl border border-border bg-background px-5 py-3 font-medium text-text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-70"
          >
            Сбросить
          </button>
        </div>

        {checkResult ? (
          <p className="mt-4 text-sm text-text-secondary">
            Результат: {checkResult.correct} / {checkResult.total}
            {items.some((item) => item.type === 'textarea')
              ? ' · Задания со свободным ответом проверяются отдельно учителем'
              : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
};
