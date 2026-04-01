import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { getPublishedLessonById } from '@/entities/lesson/api/getPublishedLessonById';
import type { Lesson } from '@/entities/lesson/model/types';
import { getLessonPracticeItems } from '@/entities/lesson-practice/api/getLessonPracticeItems';
import type { LessonPracticeItem } from '@/entities/lesson-practice/model/types';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';
import { LessonPracticeBlock } from '@/features/lesson-practice/ui/LessonPracticeBlock';
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer';

export const LessonPage = () => {
  const { courseId: courseIdParam, lessonId: lessonIdParam } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [practiceItems, setPracticeItems] = useState<LessonPracticeItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadLessonPage = async () => {
      if (!lessonIdParam) {
        setErrorMessage('Lesson id не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');

      try {
        const [nextLesson, nextPracticeItems] = await Promise.all([
          getPublishedLessonById(lessonIdParam),
          getLessonPracticeItems(lessonIdParam),
        ]);

        setLesson(nextLesson);
        setPracticeItems(nextPracticeItems);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить урок';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadLessonPage();
  }, [lessonIdParam]);

  if (!courseIdParam || !lessonIdParam) {
    return (
      <AppLayout disableOverflowHidden>
        <div className="p-6 text-accent">Course id или lesson id не найден</div>
      </AppLayout>
    );
  }

  const backToCourseRoute = routes.course.replace(':courseId', courseIdParam);

  return (
    <AppLayout disableOverflowHidden>
      <div id="top" className="flex min-h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Student panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">{lesson?.title ?? 'Урок'}</h1>
            <p className="mt-2 text-text-secondary">
              {lesson?.description?.trim() || 'Изучай теорию и переходи к практике'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={backToCourseRoute}
              className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
            >
              Назад к курсу
            </Link>

            <LogoutButton />
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-8 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? (
          <p className="mt-8 text-text-secondary">Загрузка...</p>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-text-primary">Теория</h2>

                <a
                  href="#lesson-practice"
                  className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface"
                >
                  Перейти к практике
                </a>
              </div>

              <div className="mt-6 prose max-w-none prose-headings:text-text-primary prose-p:text-text-primary prose-strong:text-text-primary prose-li:text-text-primary">
                {lesson?.theory_markdown && <MarkdownRenderer content={lesson?.theory_markdown} />}
              </div>
            </section>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <p className="text-sm font-medium uppercase tracking-wide text-text-secondary">
                Практика
              </p>
              <div className="h-px flex-1 bg-border" />
            </div>

            <section
              id="lesson-practice"
              className="rounded-3xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-text-primary">Практика</h2>

                <a
                  href="#top"
                  className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface"
                >
                  Наверх
                </a>
              </div>

              <div className="mt-6">
                <LessonPracticeBlock items={practiceItems} />
              </div>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
