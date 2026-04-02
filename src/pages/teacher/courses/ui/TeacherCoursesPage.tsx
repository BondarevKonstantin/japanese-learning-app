import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import { getCoursesByTeacher } from '@/entities/course/api/getCoursesByTeacher';
import { updateCourseStatus } from '@/entities/course/api/updateCourseStatus';
import { courseStatusClassMap, courseStatusLabelMap } from '@/entities/course/model/status';
import type { Course, CourseStatus } from '@/entities/course/model/types';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';
import { BackButton } from '@/shared/ui/BackButton';

const buildTeacherCourseLessonsRoute = (courseId: string) =>
  routes.teacherCourseLessons.replace(':courseId', courseId);

const buildTeacherGachaCardsRoute = (courseId: string) =>
  routes.teacherGachaCards.replace(':courseId', courseId);

export const TeacherCoursesPage = () => {
  const { user } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusUpdatingCourseId, setStatusUpdatingCourseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadCourses = async () => {
    if (!user?.id) {
      setErrorMessage('Пользователь не найден');
      setIsLoading(false);
      return;
    }

    setErrorMessage('');

    try {
      const nextCourses = await getCoursesByTeacher(user.id);
      setCourses(nextCourses);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить курсы';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, [user?.id]);

  const handleUpdateStatus = async (courseId: string, status: CourseStatus) => {
    setErrorMessage('');
    setStatusUpdatingCourseId(courseId);

    try {
      const updatedCourse = await updateCourseStatus({ courseId, status });

      setCourses((prevCourses) =>
        prevCourses.map((course) => (course.id === updatedCourse.id ? updatedCourse : course)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось обновить статус курса';
      setErrorMessage(message);
    } finally {
      setStatusUpdatingCourseId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Мои курсы</h1>
            <p className="mt-2 text-text-secondary">
              Создавай курсы и переходи к урокам, гаче и коллекции
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BackButton fallbackTo={routes.home} />
            <Link
              to={routes.teacherCreateCourse}
              className="rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90"
            >
              Создать курс
            </Link>

            <LogoutButton />
          </div>
        </div>

        <div className="mt-8 flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-text-primary">Список курсов</h2>
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
              <p className="text-text-primary">У тебя пока нет курсов.</p>
              <p className="mt-2 text-sm text-text-secondary">
                Создай первый курс, чтобы позже добавить в него уроки и гача-карты
              </p>

              <Link
                to={routes.teacherCreateCourse}
                className="mt-6 inline-flex rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90"
              >
                Создать курс
              </Link>
            </div>
          ) : (
            <div className="mt-6 min-h-0 flex-1 overflow-auto pr-2">
              <div className="grid gap-4 xl:grid-cols-2">
                {courses.map((course) => {
                  const isStatusUpdating = statusUpdatingCourseId === course.id;

                  return (
                    <div
                      key={course.id}
                      className="rounded-3xl border border-border bg-background p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-xl font-semibold text-text-primary">
                            {course.title}
                          </h3>

                          <p className="mt-2 text-sm text-text-secondary">
                            {course.description?.trim() || 'Без описания'}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${courseStatusClassMap[course.status]}`}
                        >
                          {courseStatusLabelMap[course.status]}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(course.id, 'draft')}
                          disabled={isStatusUpdating || course.status === 'draft'}
                          className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          В черновик
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(course.id, 'published')}
                          disabled={isStatusUpdating || course.status === 'published'}
                          className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Опубликовать
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(course.id, 'archived')}
                          disabled={isStatusUpdating || course.status === 'archived'}
                          className="rounded-2xl border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          В архив
                        </button>
                        <Link
                          to={routes.teacherEditCourse.replace(':courseId', course.id)}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-center font-medium text-text-primary transition hover:bg-background"
                        >
                          Редактировать
                        </Link>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Link
                          to={buildTeacherCourseLessonsRoute(course.id)}
                          className="rounded-2xl bg-primary px-4 py-3 text-center font-medium text-white transition hover:opacity-90"
                        >
                          Уроки
                        </Link>

                        <Link
                          to={buildTeacherGachaCardsRoute(course.id)}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-center font-medium text-text-primary transition hover:bg-background"
                        >
                          Гача-карты
                        </Link>
                      </div>

                      <p className="mt-4 text-xs text-text-secondary">
                        Создан: {new Date(course.created_at).toLocaleDateString()}
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
