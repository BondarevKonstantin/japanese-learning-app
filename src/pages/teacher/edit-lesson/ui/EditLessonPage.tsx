import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { getLessonById } from '@/entities/lesson/api/getLessonById';
import { updateLesson } from '@/entities/lesson/api/updateLesson';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';

export const EditLessonPage = () => {
  const navigate = useNavigate();
  const { courseId: courseIdParam, lessonId: lessonIdParam } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [theoryMarkdown, setTheoryMarkdown] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadLesson = async () => {
      if (!lessonIdParam) {
        setErrorMessage('Lesson id не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');

      try {
        const lesson = await getLessonById(lessonIdParam);
        setTitle(lesson.title);
        setDescription(lesson.description ?? '');
        setTheoryMarkdown(lesson.theory_markdown);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить урок';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadLesson();
  }, [lessonIdParam]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!courseIdParam || !lessonIdParam) {
      setErrorMessage('Course id или lesson id не найден');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await updateLesson({
        lessonId: lessonIdParam,
        title: title.trim(),
        description,
        theoryMarkdown,
      });

      navigate(routes.teacherCourseLessons.replace(':courseId', courseIdParam));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить урок';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!courseIdParam || !lessonIdParam) {
    return (
      <AppLayout>
        <div className="p-6 text-accent">Course id или lesson id не найден</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout disableOverflowHidden>
      <div className="flex min-h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Редактирование урока</h1>
            <p className="mt-2 text-text-secondary">Обнови название, описание и блок теории</p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 max-w-4xl rounded-3xl border border-border bg-surface p-6 shadow-sm">
          {isLoading ? (
            <p className="text-text-secondary">Загрузка...</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-text-primary">Урок</h2>

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
                    rows={4}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Теория (markdown)</span>
                  <textarea
                    value={theoryMarkdown}
                    onChange={(event) => setTheoryMarkdown(event.target.value)}
                    rows={14}
                    className="rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                    required
                  />
                </label>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !theoryMarkdown.trim()}
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
