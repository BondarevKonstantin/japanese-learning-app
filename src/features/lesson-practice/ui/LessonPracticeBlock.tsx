import { useMemo, useState } from 'react';
import type { LessonPracticeItem } from '@/entities/lesson-practice/model/types';

type Props = {
  items: LessonPracticeItem[];
};

type AnswersState = Record<string, string>;

type CheckResult = {
  total: number;
  correct: number;
};

const normalizeValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const getAcceptedAnswers = (item: LessonPracticeItem): string[] => {
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

export const LessonPracticeBlock = ({ items }: Props) => {
  const [answers, setAnswers] = useState<AnswersState>({});
  const [isChecked, setIsChecked] = useState(false);

  const handleInputChange = (itemId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const checkResult = useMemo<CheckResult | null>(() => {
    if (!isChecked) {
      return null;
    }

    let correct = 0;

    for (const item of items) {
      const userAnswer = normalizeValue(answers[item.id] ?? '');
      const acceptedAnswers = getAcceptedAnswers(item);

      if (acceptedAnswers.includes(userAnswer)) {
        correct += 1;
      }
    }

    return {
      total: items.length,
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

        const isCorrect = isChecked && acceptedAnswers.includes(normalizedUserAnswer);

        const isWrong =
          isChecked &&
          userAnswer.trim().length > 0 &&
          !acceptedAnswers.includes(normalizedUserAnswer);

        return (
          <div key={item.id} className="rounded-3xl border border-border bg-background p-5">
            <p className="text-sm text-text-secondary">Задание {index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">{item.question}</h3>

            {item.type === 'multiple_choice' && item.options?.length ? (
              <div className="mt-4 grid gap-3">
                {item.options.map((option) => {
                  const isSelected = userAnswer === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleInputChange(item.id, option)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary-light text-text-primary'
                          : 'border-border bg-surface text-text-primary hover:bg-background'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(event) => handleInputChange(item.id, event.target.value)}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                  placeholder="Введите ответ"
                />
              </div>
            )}

            {isChecked ? (
              <div className="mt-4">
                <p
                  className={`text-sm font-medium ${
                    isCorrect ? 'text-primary' : isWrong ? 'text-accent' : 'text-text-secondary'
                  }`}
                >
                  {isCorrect
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
              setAnswers({});
              setIsChecked(false);
            }}
            className="rounded-2xl border border-border bg-background px-5 py-3 font-medium text-text-primary transition hover:bg-surface"
          >
            Сбросить
          </button>
        </div>

        {checkResult ? (
          <p className="mt-4 text-sm text-text-secondary">
            Результат: {checkResult.correct} / {checkResult.total}
          </p>
        ) : null}
      </div>
    </div>
  );
};
