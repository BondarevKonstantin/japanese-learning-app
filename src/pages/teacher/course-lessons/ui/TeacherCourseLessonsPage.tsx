import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { getLessonsByCourse } from '@/entities/lesson/api/getLessonsByCourse';
import { updateLessonStatus } from '@/entities/lesson/api/updateLessonStatus';
import { lessonStatusClassMap, lessonStatusLabelMap } from '@/entities/lesson/model/status';
import type { Lesson, LessonStatus } from '@/entities/lesson/model/types';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';
import { BackButton } from '@/shared/ui/BackButton';

export const TeacherCourseLessonsPage = () => {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusUpdatingLessonId, setStatusUpdatingLessonId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadLessons = async () => {
      if (!courseIdParam) {
        setErrorMessage('Course id не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');

      try {
        const nextLessons = await getLessonsByCourse(courseIdParam);
        setLessons(nextLessons);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить уроки';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadLessons();
  }, [courseIdParam]);

  if (!courseIdParam) {
    return (
      <AppLayout>
        <div className="p-6 text-accent">Course id не найден</div>
      </AppLayout>
    );
  }

  const createLessonRoute = routes.teacherCreateLesson.replace(':courseId', courseIdParam);

  const handleUpdateStatus = async (lessonId: string, status: LessonStatus) => {
    setErrorMessage('');
    setStatusUpdatingLessonId(lessonId);

    try {
      const updatedLesson = await updateLessonStatus({ lessonId, status });

      setLessons((prevLessons) =>
        prevLessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось обновить статус урока';
      setErrorMessage(message);
    } finally {
      setStatusUpdatingLessonId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Уроки курса</h1>
            <p className="mt-2 text-text-secondary">
              Создавай и наполняй уроки для выбранного курса
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BackButton fallbackTo={routes.teacherCourses} />
            <Link
              to={createLessonRoute}
              className="rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90"
            >
              Создать урок
            </Link>

            <LogoutButton />
          </div>
        </div>

        <div className="mt-8 flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-text-primary">Список уроков</h2>
            <p className="text-sm text-text-secondary">Всего: {lessons.length}</p>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="mt-6 text-text-secondary">Загрузка...</p>
          ) : lessons.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center">
              <p className="text-text-primary">У этого курса пока нет уроков.</p>
              <p className="mt-2 text-sm text-text-secondary">
                Создай первый урок, чтобы наполнить курс контентом
              </p>

              <Link
                to={createLessonRoute}
                className="mt-6 inline-flex rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90"
              >
                Создать урок
              </Link>
            </div>
          ) : (
            <div className="mt-6 min-h-0 flex-1 overflow-auto pr-2">
              <div className="grid gap-4">
                {lessons.map((lesson, index) => {
                  const isStatusUpdating = statusUpdatingLessonId === lesson.id;

                  return (
                    <div
                      key={lesson.id}
                      className="rounded-3xl border border-border bg-background p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-text-secondary">Урок {index + 1}</p>
                          <h3 className="mt-1 text-xl font-semibold text-text-primary">
                            {lesson.title}
                          </h3>
                          <p className="mt-2 text-sm text-text-secondary">
                            {lesson.description?.trim() || 'Без описания'}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${lessonStatusClassMap[lesson.status]}`}
                        >
                          {lessonStatusLabelMap[lesson.status]}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={routes.teacherEditLesson
                            .replace(':courseId', courseIdParam)
                            .replace(':lessonId', lesson.id)}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-center font-medium text-text-primary transition hover:bg-background"
                        >
                          Редактировать
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(lesson.id, 'draft')}
                          disabled={isStatusUpdating || lesson.status === 'draft'}
                          className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          В черновик
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(lesson.id, 'published')}
                          disabled={isStatusUpdating || lesson.status === 'published'}
                          className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Опубликовать
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(lesson.id, 'archived')}
                          disabled={isStatusUpdating || lesson.status === 'archived'}
                          className="rounded-2xl border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          В архив
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          to={routes.teacherLessonPractice
                            .replace(':courseId', courseIdParam)
                            .replace(':lessonId', lesson.id)}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-center font-medium text-text-primary transition hover:bg-background"
                        >
                          Практика
                        </Link>
                      </div>

                      <p className="mt-4 text-xs text-text-secondary">
                        order_index: {lesson.order_index}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
