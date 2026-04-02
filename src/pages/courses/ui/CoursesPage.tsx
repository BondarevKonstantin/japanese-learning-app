import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { getPublishedCourses } from '@/entities/course/api/getPublishedCourses';
import type { Course } from '@/entities/course/model/types';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';
import { BackButton } from '@/shared/ui/BackButton';

const buildCourseRoute = (courseId: string) => routes.course.replace(':courseId', courseId);

export const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadCourses = async () => {
      setErrorMessage('');

      try {
        const nextCourses = await getPublishedCourses();
        setCourses(nextCourses);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить курсы';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCourses();
  }, []);

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Student panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Курсы</h1>
            <p className="mt-2 text-text-secondary">Выбери курс и начни изучение японского</p>
          </div>

          <BackButton fallbackTo={routes.home} />

          <LogoutButton />
        </div>

        <div className="mt-8 flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-text-primary">Доступные курсы</h2>
            <p className="text-sm text-text-secondary">Всего: {courses.length}</p>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="mt-6 text-text-secondary">Загрузка...</p>
          ) : courses.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center">
              <p className="text-text-primary">Пока нет доступных курсов.</p>
              <p className="mt-2 text-sm text-text-secondary">
                Когда преподаватель опубликует курс, он появится здесь
              </p>
            </div>
          ) : (
            <div className="mt-6 min-h-0 flex-1 overflow-auto pr-2">
              <div className="grid gap-4 xl:grid-cols-2">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-3xl border border-border bg-background p-5"
                  >
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold text-text-primary">{course.title}</h3>

                      <p className="mt-2 text-sm text-text-secondary">
                        {course.description?.trim() || 'Без описания'}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        to={buildCourseRoute(course.id)}
                        className="rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90"
                      >
                        Открыть курс
                      </Link>

                      <Link
                        to={routes.courseGacha.replace(':courseId', course.id)}
                        className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
                      >
                        Гача
                      </Link>

                      <Link
                        to={routes.courseCollection.replace(':courseId', course.id)}
                        className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
                      >
                        Коллекция
                      </Link>
                    </div>

                    <p className="mt-4 text-xs text-text-secondary">
                      Опубликован: {new Date(course.created_at).toLocaleDateString()}
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
