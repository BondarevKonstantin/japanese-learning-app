import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AppLayout } from '@/app/layouts/AppLayout';
import { getPublishedLessonById } from '@/entities/lesson/api/getPublishedLessonById';
import type { Lesson } from '@/entities/lesson/model/types';
import { getLessonPracticeItems } from '@/entities/lesson-practice/api/getLessonPracticeItems';
import type { LessonPracticeItem } from '@/entities/lesson-practice/model/types';
import type { LessonResultItem } from '@/entities/lesson-submission/model/types';
import { PracticeItemMedia } from '@/features/lesson-practice-media/ui/PracticeItemMedia';
import { getMyLessonResults } from '@/features/lesson-submission/api/getMyLessonResults';
import { routes } from '@/shared/config/routes';

const formatCorrectAnswer = (value: string | string[]) => {
  if (Array.isArray(value)) {
    return value.join('; ');
  }

  return value;
};

const readErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const LessonResultsPage = () => {
  const { courseId: courseIdParam, lessonId: lessonIdParam } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [results, setResults] = useState<LessonResultItem[]>([]);
  const [practiceItemsById, setPracticeItemsById] = useState<Map<string, LessonPracticeItem>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [mediaNotice, setMediaNotice] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!lessonIdParam) {
        setErrorMessage('Lesson id не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');
      setMediaNotice('');

      const [lessonResult, resultsResult, practiceItemsResult] = await Promise.allSettled([
        getPublishedLessonById(lessonIdParam),
        getMyLessonResults(lessonIdParam),
        getLessonPracticeItems(lessonIdParam),
      ]);

      if (lessonResult.status === 'rejected') {
        setErrorMessage(readErrorMessage(lessonResult.reason, 'Не удалось загрузить результаты'));
        setIsLoading(false);
        return;
      }

      if (resultsResult.status === 'rejected') {
        setErrorMessage(readErrorMessage(resultsResult.reason, 'Не удалось загрузить результаты'));
        setIsLoading(false);
        return;
      }

      setLesson(lessonResult.value);
      setResults(resultsResult.value);

      if (practiceItemsResult.status === 'fulfilled') {
        setPracticeItemsById(new Map(practiceItemsResult.value.map((item) => [item.id, item])));
      } else {
        setPracticeItemsById(new Map());
        setMediaNotice(
          readErrorMessage(
            practiceItemsResult.reason,
            'Не удалось загрузить изображения заданий. Показаны фотографии из результата, если они есть.',
          ),
        );
      }

      setIsLoading(false);
    };

    void loadData();
  }, [lessonIdParam]);

  const backToLessonRoute = useMemo(() => {
    if (!courseIdParam || !lessonIdParam) {
      return routes.courses;
    }

    return routes.lesson.replace(':courseId', courseIdParam).replace(':lessonId', lessonIdParam);
  }, [courseIdParam, lessonIdParam]);

  if (!courseIdParam || !lessonIdParam) {
    return (
      <AppLayout disableOverflowHidden>
        <div className="p-6 text-accent">Course id или lesson id не найден</div>
      </AppLayout>
    );
  }

  const submissionStatus = results[0]?.submission_status ?? null;
  const reviewedAt = results[0]?.reviewed_at ?? null;

  return (
    <AppLayout disableOverflowHidden>
      <div className="flex min-h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Результаты проверки</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">{lesson?.title ?? 'Урок'}</h1>
            <p className="mt-2 text-text-secondary">
              {submissionStatus === 'reviewed'
                ? reviewedAt
                  ? `Работа проверена: ${new Date(reviewedAt).toLocaleString()}`
                  : 'Работа проверена'
                : 'Результаты пока недоступны'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={backToLessonRoute}
              className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
            >
              Назад к уроку
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-sm">
          {isLoading ? (
            <p className="text-text-secondary">Загрузка...</p>
          ) : errorMessage ? (
            <p className="rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
              {errorMessage}
            </p>
          ) : results.length === 0 ? (
            <p className="text-text-secondary">Результаты пока недоступны.</p>
          ) : submissionStatus !== 'reviewed' ? (
            <p className="text-text-secondary">
              Ответы отправлены учителю, но проверка ещё не завершена.
            </p>
          ) : (
            <div className="grid gap-4">
              {mediaNotice ? <p className="text-sm text-text-secondary">{mediaNotice}</p> : null}
              {results.map((item, index) => {
                const practiceItem = practiceItemsById.get(item.practice_item_id);

                return (
                  <div
                    key={item.answer_id}
                    className="rounded-3xl border border-border bg-background p-5"
                  >
                    <p className="text-sm text-text-secondary">Задание {index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold text-text-primary">
                      {item.question}
                    </h3>

                    <PracticeItemMedia
                      imageBlock={practiceItem?.image_block ?? null}
                      imageUrl={item.image_url ?? practiceItem?.image_url ?? null}
                    />

                    <div className="mt-4 grid gap-2 text-sm">
                      <p className="text-text-secondary">
                        Ваш ответ:{' '}
                        <span className="text-text-primary">{item.answer_text || '—'}</span>
                      </p>

                      {item.practice_item_type !== 'textarea' ? (
                        <>
                          <p className="text-text-secondary">
                            Правильный ответ:{' '}
                            <span className="text-text-primary">
                              {formatCorrectAnswer(item.correct_answer) || '—'}
                            </span>
                          </p>

                          <p className="text-text-secondary">
                            Автопроверка:{' '}
                            <span className="text-text-primary">
                              {item.is_auto_correct === true
                                ? 'Верно'
                                : item.is_auto_correct === false
                                  ? 'Неверно'
                                  : '—'}
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="text-text-secondary">
                          Формат проверки:{' '}
                          <span className="text-text-primary">Проверено учителем вручную</span>
                        </p>
                      )}

                      <p className="text-text-secondary">
                        Комментарий учителя:{' '}
                        <span className="text-text-primary">
                          {item.teacher_comment || 'Комментарий не добавлен'}
                        </span>
                      </p>

                      {item.explanation ? (
                        <p className="text-text-secondary">
                          Пояснение: <span className="text-text-primary">{item.explanation}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
