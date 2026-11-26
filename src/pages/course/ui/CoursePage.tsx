import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import { getCourseById } from '@/entities/course/api/getCourseById';
import { getPublishedCourseById } from '@/entities/course/api/getPublishedCourseById';
import type { Course } from '@/entities/course/model/types';
import { getLessonsByCourse } from '@/entities/lesson/api/getLessonsByCourse';
import { getPublishedLessonsByCourse } from '@/entities/lesson/api/getPublishedLessonsByCourse';
import type { Lesson } from '@/entities/lesson/model/types';
import type { LessonSubmission } from '@/entities/lesson-submission/model/types';
import { isCourseFullyCompleted } from '@/features/lesson/api/isCourseFullyCompleted';
import { markCourseFinaleCompleted } from '@/pages/course/model/courseFinaleStorage';
import {
  isCourseIntroCompleted,
  markCourseIntroCompleted,
} from '@/pages/course/model/courseIntroStorage';
import { CourseFinaleViewer } from '@/pages/course/ui/CourseFinaleViewer';
import { CourseIntroViewer } from '@/pages/course/ui/CourseIntroViewer';
import { supabase } from '@/shared/api/supabase/client';
import { isCourseStoryEnabled } from '@/shared/config/courseStory';
import { routes } from '@/shared/config/routes';
import { BackButton } from '@/shared/ui/BackButton';

const buildLessonRoute = (courseId: string, lessonId: string) =>
  routes.lesson.replace(':courseId', courseId).replace(':lessonId', lessonId);

const buildTeacherLessonPreviewRoute = (courseId: string, lessonId: string) =>
  routes.teacherLessonPreview.replace(':courseId', courseId).replace(':lessonId', lessonId);

const buildLessonResultsRoute = (courseId: string, lessonId: string) =>
  routes.lessonResults.replace(':courseId', courseId).replace(':lessonId', lessonId);

const buildCourseGachaRoute = (courseId: string) =>
  routes.courseGacha.replace(':courseId', courseId);

const buildCourseCollectionRoute = (courseId: string) =>
  routes.courseCollection.replace(':courseId', courseId);

type CoursePageProps = {
  mode?: 'student' | 'teacher-preview';
};

type IntroUiState = {
  visitKey: string;
  dismissed: boolean;
  replay: boolean;
};

type FinaleUiState = {
  visitKey: string;
  replay: boolean;
  fullyCompleted: boolean;
};

export const CoursePage = ({ mode = 'student' }: CoursePageProps) => {
  const { user, profile } = useAuth();
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();
  const isTeacherPreview = mode === 'teacher-preview';

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, LessonSubmission>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const visitKey = `${user?.id ?? ''}:${courseIdParam ?? ''}`;
  const [introUi, setIntroUi] = useState<IntroUiState>({
    visitKey,
    dismissed: false,
    replay: false,
  });

  const [finaleUi, setFinaleUi] = useState<FinaleUiState>({
    visitKey,
    replay: false,
    fullyCompleted: false,
  });

  if (introUi.visitKey !== visitKey) {
    setIntroUi({ visitKey, dismissed: false, replay: false });
  }

  if (finaleUi.visitKey !== visitKey) {
    setFinaleUi({ visitKey, replay: false, fullyCompleted: false });
  }

  const introDismissed = introUi.visitKey === visitKey && introUi.dismissed;
  const replayOpen = introUi.visitKey === visitKey && introUi.replay;
  const finaleReplayOpen = finaleUi.visitKey === visitKey && finaleUi.replay;
  const finaleFullyCompleted = finaleUi.visitKey === visitKey && finaleUi.fullyCompleted;
  const storyCourse =
    !isLoading &&
    course &&
    course.id === courseIdParam &&
    user?.id &&
    isCourseStoryEnabled(course.id)
      ? { course, userId: user.id }
      : null;
  const introOpen =
    storyCourse !== null &&
    (replayOpen ||
      (profile?.role === 'student' &&
        !isTeacherPreview &&
        !introDismissed &&
        !isCourseIntroCompleted(storyCourse.userId, storyCourse.course.id)));
  const canReplayFinale =
    storyCourse !== null &&
    (isTeacherPreview || (profile?.role === 'student' && finaleFullyCompleted));

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
          isTeacherPreview ? getCourseById(courseIdParam) : getPublishedCourseById(courseIdParam),
          isTeacherPreview
            ? getLessonsByCourse(courseIdParam)
            : getPublishedLessonsByCourse(courseIdParam),
        ]);

        if (isTeacherPreview && nextCourse.created_by !== user?.id) {
          throw new Error('Нет доступа к предпросмотру этого курса');
        }

        setCourse(nextCourse);
        setLessons(nextLessons);

        if (isTeacherPreview) {
          setSubmissionsMap({});
          return;
        }

        const { data: submissions, error } = await supabase
          .from('lesson_submissions')
          .select('*')
          .eq('course_id', courseIdParam);

        if (error) {
          throw error;
        }

        const map: Record<string, LessonSubmission> = {};

        (submissions ?? []).forEach((submission) => {
          map[submission.lesson_id] = submission;
        });

        setSubmissionsMap(map);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить курс';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCoursePage();
  }, [courseIdParam, isTeacherPreview, user?.id]);

  useEffect(() => {
    if (
      !courseIdParam ||
      !user?.id ||
      isTeacherPreview ||
      profile?.role !== 'student' ||
      !isCourseStoryEnabled(courseIdParam)
    ) {
      return;
    }

    let ignore = false;
    const courseId = courseIdParam;
    const userId = user.id;
    const requestKey = `${userId}:${courseId}`;

    void isCourseFullyCompleted(courseId, userId)
      .then((completed) => {
        if (ignore) {
          return;
        }

        setFinaleUi((current) => {
          if (current.visitKey !== requestKey) {
            return current;
          }

          return { ...current, fullyCompleted: completed };
        });
      })
      .catch(() => {
        if (ignore) {
          return;
        }

        setFinaleUi((current) => {
          if (current.visitKey !== requestKey) {
            return current;
          }

          return { ...current, fullyCompleted: false };
        });
      });

    return () => {
      ignore = true;
    };
  }, [courseIdParam, isTeacherPreview, profile?.role, user?.id]);

  const closeIntro = () => {
    setIntroUi({ visitKey, dismissed: true, replay: false });
  };

  const completeIntro = () => {
    if (!isTeacherPreview && storyCourse) {
      markCourseIntroCompleted(storyCourse.userId, storyCourse.course.id);
    }

    setIntroUi({ visitKey, dismissed: true, replay: false });
  };

  const replayIntro = () => {
    if (!storyCourse) {
      return;
    }

    setIntroUi({ visitKey, dismissed: introDismissed, replay: true });
  };

  const replayFinale = () => {
    if (!canReplayFinale) {
      return;
    }

    setFinaleUi((current) =>
      current.visitKey === visitKey ? { ...current, replay: true } : current,
    );
  };

  const closeFinale = () => {
    setFinaleUi((current) =>
      current.visitKey === visitKey ? { ...current, replay: false } : current,
    );
  };

  const completeFinale = () => {
    if (!isTeacherPreview && profile?.role === 'student' && storyCourse) {
      markCourseFinaleCompleted(storyCourse.userId, storyCourse.course.id);
    }

    closeFinale();
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
        {isTeacherPreview ? (
          <div className="mb-6 rounded-3xl border border-primary bg-primary-light px-5 py-4 text-text-primary">
            <p className="font-semibold">Режим предпросмотра</p>
            <p className="mt-1 text-sm">Так курс будет выглядеть для ученика после публикации.</p>
          </div>
        ) : null}

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-sm font-medium text-accent">
              {isTeacherPreview ? 'Teacher preview' : 'Student panel'}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">{course?.title ?? 'Курс'}</h1>
            <p className="mt-2 text-text-secondary">
              {course?.description?.trim() || 'Изучай уроки и открывай новые карточки'}
            </p>
            {storyCourse ? (
              <div className="mt-3 flex flex-col items-start gap-2">
                <button
                  type="button"
                  onClick={replayIntro}
                  className="text-sm font-medium text-accent transition hover:opacity-80"
                >
                  Посмотреть вступление
                </button>
                {canReplayFinale ? (
                  <button
                    type="button"
                    onClick={replayFinale}
                    className="text-sm font-medium text-accent transition hover:opacity-80"
                  >
                    Посмотреть поздравление
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BackButton fallbackTo={isTeacherPreview ? routes.teacherCourses : routes.courses} />
            {isTeacherPreview ? (
              <Link
                to={routes.teacherEditCourse.replace(':courseId', courseIdParam)}
                className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
              >
                Вернуться к редактированию
              </Link>
            ) : null}
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
              </div>
            ) : (
              <div className="mt-6 min-h-0 flex-1 overflow-auto pr-2">
                <div className="grid gap-4">
                  {lessons.map((lesson, index) => {
                    const submission = submissionsMap[lesson.id];

                    const isSubmitted = submission?.status === 'submitted';
                    const isReviewed = submission?.status === 'reviewed';

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

                            {submission ? (
                              <p className="mt-3 text-sm text-text-secondary">
                                Статус:{' '}
                                <span className="text-text-primary">
                                  {isReviewed ? 'Проверено' : isSubmitted ? 'На проверке' : '—'}
                                </span>
                              </p>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 gap-2">
                            {isReviewed ? (
                              <Link
                                to={buildLessonResultsRoute(courseIdParam, lesson.id)}
                                className="rounded-2xl border border-border px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-surface"
                              >
                                Результаты
                              </Link>
                            ) : null}

                            <Link
                              to={
                                isTeacherPreview
                                  ? buildTeacherLessonPreviewRoute(courseIdParam, lesson.id)
                                  : buildLessonRoute(courseIdParam, lesson.id)
                              }
                              className="rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90"
                            >
                              Открыть
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

            {!isTeacherPreview ? (
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
            ) : null}
          </div>
        </div>
      </div>
      {introOpen ? (
        <CourseIntroViewer key={visitKey} onClose={closeIntro} onComplete={completeIntro} />
      ) : null}
      {storyCourse && finaleReplayOpen ? (
        <CourseFinaleViewer
          key={`finale-${visitKey}`}
          onClose={closeFinale}
          onComplete={completeFinale}
        />
      ) : null}
    </AppLayout>
  );
};
