import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { getLessonsByCourse } from '@/entities/lesson/api/getLessonsByCourse';
import type { Lesson } from '@/entities/lesson/model/types';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';

const statusLabelMap: Record<Lesson['status'], string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
};

const statusClassMap: Record<Lesson['status'], string> = {
  draft: 'border-border bg-background text-text-primary',
  published: 'border-primary bg-primary-light text-text-primary',
  archived: 'border-accent bg-secondary text-accent',
};

export const TeacherCourseLessonsPage = () => {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
                {lessons.map((lesson, index) => (
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
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusClassMap[lesson.status]}`}
                      >
                        {statusLabelMap[lesson.status]}
                      </span>
                    </div>

                    <p className="mt-4 text-xs text-text-secondary">
                      order_index: {lesson.order_index}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
