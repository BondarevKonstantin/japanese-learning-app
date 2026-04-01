import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { updateCourse } from '@/entities/course/api/updateCourse';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';
import { getCourseById } from '@/entities/course/api/getCourseById';

export const EditCoursePage = () => {
  const navigate = useNavigate();
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseIdParam) {
        setErrorMessage('Course id не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');

      try {
        const course = await getCourseById(courseIdParam);
        setTitle(course.title);
        setDescription(course.description ?? '');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить курс';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCourse();
  }, [courseIdParam]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!courseIdParam) {
      setErrorMessage('Course id не найден');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await updateCourse({
        courseId: courseIdParam,
        title: title.trim(),
        description,
      });

      navigate(routes.teacherCourses);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить курс';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Редактирование курса</h1>
            <p className="mt-2 text-text-secondary">Обнови название и описание курса</p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 max-w-3xl rounded-3xl border border-border bg-surface p-6 shadow-sm">
          {isLoading ? (
            <p className="text-text-secondary">Загрузка...</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-text-primary">Курс</h2>

              <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Название</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Описание</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={6}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                  />
                </label>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </>
          )}

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
};
