import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { getPublishedCourseById } from '@/entities/course/api/getPublishedCourseById';
import type { Course } from '@/entities/course/model/types';
import { getPublishedLessonsByCourse } from '@/entities/lesson/api/getPublishedLessonsByCourse';
import type { Lesson } from '@/entities/lesson/model/types';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';

const buildLessonRoute = (courseId: string, lessonId: string) =>
  routes.lesson.replace(':courseId', courseId).replace(':lessonId', lessonId);

const buildCourseGachaRoute = (courseId: string) =>
  routes.courseGacha.replace(':courseId', courseId);

const buildCourseCollectionRoute = (courseId: string) =>
  routes.courseCollection.replace(':courseId', courseId);

export const CoursePage = () => {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadCoursePage = async () => {
      if (!courseIdParam) {
        setErrorMessage('Course id не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');

      try {
        const [nextCourse, nextLessons] = await Promise.all([
          getPublishedCourseById(courseIdParam),
          getPublishedLessonsByCourse(courseIdParam),
        ]);

        setCourse(nextCourse);
        setLessons(nextLessons);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить курс';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCoursePage();
  }, [courseIdParam]);

  if (!courseIdParam) {
    return (
      <AppLayout>
        <div className="p-6 text-accent">Course id не найден</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Student panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">{course?.title ?? 'Курс'}</h1>
            <p className="mt-2 text-text-secondary">
              {course?.description?.trim() || 'Изучай уроки и открывай новые карточки'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={routes.courses}
              className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
            >
              Все курсы
            </Link>

            <LogoutButton />
          </div>
        </div>

        <div className="mt-8 grid min-h-0 flex-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-text-primary">Уроки курса</h2>
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
                <p className="text-text-primary">У этого курса пока нет доступных уроков.</p>
                <p className="mt-2 text-sm text-text-secondary">
                  Когда преподаватель опубликует уроки, они появятся здесь
                </p>
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

                        <Link
                          to={buildLessonRoute(courseIdParam, lesson.id)}
                          className="shrink-0 rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90"
                        >
                          Открыть
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-text-primary">О курсе</h2>
              <p className="mt-4 text-sm leading-6 text-text-secondary">
                {course?.description?.trim() || 'Описание курса пока не добавлено'}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-text-primary">Дополнительно</h2>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to={buildCourseGachaRoute(courseIdParam)}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-center font-medium text-text-primary transition hover:bg-surface"
                >
                  Открыть гачу
                </Link>

                <Link
                  to={buildCourseCollectionRoute(courseIdParam)}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-center font-medium text-text-primary transition hover:bg-surface"
                >
                  Моя коллекция
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
