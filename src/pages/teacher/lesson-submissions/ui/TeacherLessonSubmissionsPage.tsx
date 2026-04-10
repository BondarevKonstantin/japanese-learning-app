import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AppLayout } from '@/app/layouts/AppLayout';
import { getLessonById } from '@/entities/lesson/api/getLessonById';
import type { Lesson } from '@/entities/lesson/model/types';
import type { TeacherLessonSubmissionListItem } from '@/entities/lesson-submission/model/types';
import { getLessonSubmissions } from '@/features/lesson-submission/api/getLessonSubmissions';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';

const submissionStatusLabelMap: Record<TeacherLessonSubmissionListItem['status'], string> = {
  submitted: 'На проверке',
  reviewed: 'Проверено',
};

export const TeacherLessonSubmissionsPage = () => {
  const { courseId: courseIdParam, lessonId: lessonIdParam } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [submissions, setSubmissions] = useState<TeacherLessonSubmissionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!lessonIdParam) {
        setErrorMessage('Lesson id не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');

      try {
        const [nextLesson, nextSubmissions] = await Promise.all([
          getLessonById(lessonIdParam),
          getLessonSubmissions(lessonIdParam),
        ]);

        setLesson(nextLesson);
        setSubmissions(nextSubmissions);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось загрузить отправленные работы';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [lessonIdParam]);

  const backToLessonPracticeRoute = useMemo(() => {
    if (!courseIdParam || !lessonIdParam) {
      return routes.teacherCourses;
    }

    return routes.teacherLessonPractice
      .replace(':courseId', courseIdParam)
      .replace(':lessonId', lessonIdParam);
  }, [courseIdParam, lessonIdParam]);

  if (!courseIdParam || !lessonIdParam) {
    return (
      <AppLayout disableOverflowHidden>
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
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Проверка работ</h1>
            <p className="mt-2 text-text-secondary">
              {lesson ? `Урок: ${lesson.title}` : 'Список отправленных работ'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={backToLessonPracticeRoute}
              className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
            >
              Назад к практике урока
            </Link>

            <LogoutButton />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-sm">
          {isLoading ? (
            <p className="text-text-secondary">Загрузка...</p>
          ) : errorMessage ? (
            <p className="rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
              {errorMessage}
            </p>
          ) : submissions.length === 0 ? (
            <p className="text-text-secondary">По этому уроку пока нет отправленных работ.</p>
          ) : (
            <div className="grid gap-4">
              {submissions.map((submission, index) => {
                const reviewRoute = routes.teacherLessonSubmissionReview
                  .replace(':courseId', courseIdParam)
                  .replace(':lessonId', lessonIdParam)
                  .replace(':submissionId', submission.id);

                return (
                  <div
                    key={submission.id}
                    className="rounded-3xl border border-border bg-background p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm text-text-secondary">Работа {index + 1}</p>
                        <h3 className="mt-1 text-lg font-semibold text-text-primary">
                          Ученик: {submission.user_id}
                        </h3>

                        <div className="mt-3 grid gap-2 text-sm text-text-secondary">
                          <p>
                            Статус:{' '}
                            <span className="text-text-primary">
                              {submissionStatusLabelMap[submission.status]}
                            </span>
                          </p>

                          <p>
                            Отправлено:{' '}
                            <span className="text-text-primary">
                              {submission.submitted_at
                                ? new Date(submission.submitted_at).toLocaleString()
                                : '—'}
                            </span>
                          </p>

                          <p>
                            Проверено:{' '}
                            <span className="text-text-primary">
                              {submission.reviewed_at
                                ? new Date(submission.reviewed_at).toLocaleString()
                                : '—'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <Link
                        to={reviewRoute}
                        className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90"
                      >
                        {submission.status === 'reviewed' ? 'Открыть проверку' : 'Проверить'}
                      </Link>
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
