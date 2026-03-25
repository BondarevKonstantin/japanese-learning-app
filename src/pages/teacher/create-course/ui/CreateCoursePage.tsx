import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import { createCourse } from '@/entities/course/api/createCourse';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';

export const CreateCoursePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      setErrorMessage('Пользователь не найден');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await createCourse({
        title: title.trim(),
        description,
        createdBy: user.id,
      });

      navigate(routes.teacherCourses);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать курс';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Создание курса</h1>
            <p className="mt-2 text-text-secondary">
              Создай новый курс, чтобы позже добавлять в него уроки и гача-карты
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 max-w-3xl rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">Новый курс</h2>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-primary">Название</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                placeholder="Например, Японский N5"
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
                placeholder="Кратко опиши, о чем этот курс"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Создание...' : 'Создать курс'}
              </button>
            </div>
          </form>

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
