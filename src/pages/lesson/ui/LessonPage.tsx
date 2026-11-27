import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import { getCourseById } from '@/entities/course/api/getCourseById';
import { getLessonById } from '@/entities/lesson/api/getLessonById';
import { getPublishedLessonById } from '@/entities/lesson/api/getPublishedLessonById';
import { getPublishedLessonsByCourse } from '@/entities/lesson/api/getPublishedLessonsByCourse';
import type { Lesson } from '@/entities/lesson/model/types';
import { getLessonPracticeItems } from '@/entities/lesson-practice/api/getLessonPracticeItems';
import type { LessonPracticeItem } from '@/entities/lesson-practice/model/types';
import { completeLesson, type CompleteLessonResult } from '@/features/lesson/api/completeLesson';
import { getLessonCompletionStatus } from '@/features/lesson/api/getLessonCompletionStatus';
import { isCourseFullyCompleted } from '@/features/lesson/api/isCourseFullyCompleted';
import { getMyLessonSubmission } from '@/features/lesson-submission/api/getMyLessonSubmission';
import { submitLessonAnswers } from '@/features/lesson-submission/api/submitLessonAnswers';
import { LessonPracticeBlock } from '@/features/lesson-practice/ui/LessonPracticeBlock';
import { CourseGiftDialog } from '@/features/course-gift/ui/CourseGiftDialog';
import {
  isCourseFinaleCompleted,
  markCourseFinaleCompleted,
} from '@/pages/course/model/courseFinaleStorage';
import { findNextPublishedLesson } from '@/pages/lesson/model/findNextPublishedLesson';
import { CourseFinaleViewer } from '@/pages/course/ui/CourseFinaleViewer';
import { isCourseStoryEnabled } from '@/shared/config/courseStory';
import { routes } from '@/shared/config/routes';
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer';
import type { LessonSubmission } from '@/entities/lesson-submission/model/types';

type LessonPageProps = {
  mode?: 'student' | 'teacher-preview';
};

type FinaleUiState = {
  visitKey: string;
  open: boolean;
  courseId: string | null;
  autoOpened: boolean;
  giftCourseId: string | null;
};

type CompletionReadState = 'loading' | 'ready' | 'error';

type LessonNavState = {
  requestKey: string;
  status: 'loading' | 'unavailable' | 'ready';
  nextLesson: { id: string; title: string } | null;
};

const primaryButtonClassName =
  'inline-flex min-h-11 w-full scroll-mb-[40dvh] items-center justify-center rounded-2xl bg-primary px-5 py-3 text-center font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto';

const surfaceButtonClassName =
  'inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-border bg-surface px-4 py-3 text-center font-medium text-text-primary transition hover:bg-background sm:w-auto';

const ghostButtonClassName =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface sm:min-h-0';

const scrollLessonPageToStart = (anchor: HTMLElement | null) => {
  const scrollingElement = document.scrollingElement;
  if (scrollingElement) {
    scrollingElement.scrollTop = 0;
  }

  window.scrollTo(0, 0);

  let parent = anchor?.parentElement ?? null;
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      parent.scrollTop = 0;
    }
    parent = parent.parentElement;
  }
};

const sameCourseId = (left: string, right: string): boolean => {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
};

const readAutoFinaleCourseId = (
  result: CompleteLessonResult,
  courseId: string | undefined,
  userId: string | undefined,
  role: string | undefined,
  isTeacherPreview: boolean,
): string | null => {
  if (isTeacherPreview || role !== 'student' || !userId || !courseId) {
    return null;
  }

  if (result.completed_now !== true || typeof result.course_id !== 'string') {
    return null;
  }

  if (!sameCourseId(courseId, result.course_id) || !isCourseStoryEnabled(result.course_id)) {
    return null;
  }

  if (isCourseFinaleCompleted(userId, result.course_id)) {
    return null;
  }

  return result.course_id;
};

const readErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
};

export const LessonPage = ({ mode = 'student' }: LessonPageProps) => {
  const { user } = useAuth();
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const pageKey = `${mode}:${user?.id ?? ''}:${courseId ?? ''}:${lessonId ?? ''}`;

  return <LessonPageView key={pageKey} mode={mode} />;
};

const LessonPageView = ({ mode = 'student' }: LessonPageProps) => {
  const { user, profile } = useAuth();
  const { courseId: courseIdParam, lessonId: lessonIdParam } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const isTeacherPreview = mode === 'teacher-preview';

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [practiceItems, setPracticeItems] = useState<LessonPracticeItem[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<LessonSubmission | null>(null);
  const [answersPersisted, setAnswersPersisted] = useState(false);
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [completionRead, setCompletionRead] = useState<CompletionReadState>('loading');
  const [navAttempt, setNavAttempt] = useState(0);
  const navRequestKey = isTeacherPreview
    ? ''
    : `${courseIdParam ?? ''}:${lessonIdParam ?? ''}:${navAttempt}`;
  const [lessonNav, setLessonNav] = useState<LessonNavState>({
    requestKey: navRequestKey,
    status: 'loading',
    nextLesson: null,
  });

  if (!isTeacherPreview && lessonNav.requestKey !== navRequestKey) {
    setLessonNav({
      requestKey: navRequestKey,
      status: 'loading',
      nextLesson: null,
    });
  }

  const [completionMessage, setCompletionMessage] = useState('');
  const [completionError, setCompletionError] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const finaleVisitKey = `${user?.id ?? ''}:${courseIdParam ?? ''}:${lessonIdParam ?? ''}`;
  const finaleEpochRef = useRef(0);
  const requestGuardRef = useRef(0);
  const completionVersionRef = useRef(0);
  const isMountedRef = useRef(true);
  const topRef = useRef<HTMLDivElement>(null);
  const [finaleUi, setFinaleUi] = useState<FinaleUiState>({
    visitKey: finaleVisitKey,
    open: false,
    courseId: null,
    autoOpened: false,
    giftCourseId: null,
  });

  if (finaleUi.visitKey !== finaleVisitKey) {
    setFinaleUi({
      visitKey: finaleVisitKey,
      open: false,
      courseId: null,
      autoOpened: false,
      giftCourseId: null,
    });
  }

  useLayoutEffect(() => {
    scrollLessonPageToStart(topRef.current);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const guard = ++requestGuardRef.current;
    const isCurrent = () => requestGuardRef.current === guard;
    const completionVersionAtStart = completionVersionRef.current;

    const loadLessonPage = async () => {
      if (!lessonIdParam) {
        if (!isCurrent()) {
          return;
        }

        setErrorMessage('Lesson id не найден');
        setIsLoading(false);
        return;
      }

      if (!user?.id) {
        if (!isCurrent()) {
          return;
        }

        setErrorMessage('Пользователь не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');
      setCompletionError('');
      setCompletionMessage('');

      try {
        if (isTeacherPreview) {
          if (!courseIdParam) {
            throw new Error('Course id не найден');
          }

          const [previewCourse, nextLesson, nextPracticeItems] = await Promise.all([
            getCourseById(courseIdParam),
            getLessonById(lessonIdParam),
            getLessonPracticeItems(lessonIdParam),
          ]);

          if (previewCourse.created_by !== user.id || nextLesson.course_id !== courseIdParam) {
            throw new Error('Нет доступа к предпросмотру этого урока');
          }

          if (!isCurrent()) {
            return;
          }

          setLesson(nextLesson);
          setPracticeItems(nextPracticeItems);
          setPracticeAnswers({});
          setSubmission(null);
          setAnswersPersisted(false);
          setIsLessonCompleted(false);
          setCompletionRead('ready');
          return;
        }

        const [nextLesson, nextPracticeItems, nextSubmissionDetails, completion] = await Promise.all([
          getPublishedLessonById(lessonIdParam),
          getLessonPracticeItems(lessonIdParam),
          getMyLessonSubmission(lessonIdParam),
          getLessonCompletionStatus(lessonIdParam, user.id).then(
            (status) => ({ ok: true as const, isCompleted: status.isCompleted }),
            () => ({ ok: false as const }),
          ),
        ]);

        if (!isCurrent()) {
          return;
        }

        if (!courseIdParam || !sameCourseId(nextLesson.course_id, courseIdParam)) {
          throw new Error('Урок не относится к этому курсу');
        }

        setLesson(nextLesson);
        setPracticeItems(nextPracticeItems);
        setSubmission(nextSubmissionDetails?.submission ?? null);
        setAnswersPersisted(false);
        setPracticeAnswers(
          (nextSubmissionDetails?.answers ?? []).reduce<Record<string, string>>((acc, answer) => {
            acc[answer.practice_item_id] = answer.answer_text ?? '';
            return acc;
          }, {}),
        );

        if (completionVersionRef.current === completionVersionAtStart) {
          if (completion.ok) {
            setIsLessonCompleted(completion.isCompleted);
            setCompletionRead('ready');
          } else {
            setIsLessonCompleted(false);
            setCompletionRead('error');
          }
        }
      } catch (error) {
        if (!isCurrent()) {
          return;
        }

        setErrorMessage(readErrorMessage(error, 'Не удалось загрузить урок'));
      } finally {
        if (isCurrent()) {
          setIsLoading(false);
        }
      }
    };

    void loadLessonPage();

    return () => {
      requestGuardRef.current += 1;
    };
  }, [courseIdParam, isTeacherPreview, lessonIdParam, user?.id]);

  useEffect(() => {
    if (isTeacherPreview || !courseIdParam || !lessonIdParam) {
      return;
    }

    let ignore = false;
    const requestKey = navRequestKey;

    void getPublishedLessonsByCourse(courseIdParam)
      .then((publishedLessons) => {
        if (ignore) {
          return;
        }

        const resolved = findNextPublishedLesson(publishedLessons, courseIdParam, lessonIdParam);

        if (resolved.status === 'missing') {
          setLessonNav({ requestKey, status: 'unavailable', nextLesson: null });
          return;
        }

        setLessonNav({
          requestKey,
          status: 'ready',
          nextLesson: resolved.nextLesson
            ? { id: resolved.nextLesson.id, title: resolved.nextLesson.title }
            : null,
        });
      })
      .catch(() => {
        if (ignore) {
          return;
        }

        setLessonNav({ requestKey, status: 'unavailable', nextLesson: null });
      });

    return () => {
      ignore = true;
    };
  }, [courseIdParam, isTeacherPreview, lessonIdParam, navAttempt, navRequestKey]);

  useEffect(() => {
    return () => {
      finaleEpochRef.current += 1;
    };
  }, [finaleVisitKey]);

  const backToCourseRoute = useMemo(() => {
    if (!courseIdParam) {
      return routes.courses;
    }

    return isTeacherPreview
      ? routes.teacherCoursePreview.replace(':courseId', courseIdParam)
      : routes.course.replace(':courseId', courseIdParam);
  }, [courseIdParam, isTeacherPreview]);

  const resultsRoute = useMemo(() => {
    if (!courseIdParam || !lessonIdParam) {
      return routes.courses;
    }

    return routes.lessonResults
      .replace(':courseId', courseIdParam)
      .replace(':lessonId', lessonIdParam);
  }, [courseIdParam, lessonIdParam]);

  const navIsCurrent = isTeacherPreview || lessonNav.requestKey === navRequestKey;
  const navStatus = navIsCurrent ? lessonNav.status : 'loading';
  const nextLesson = navStatus === 'ready' ? lessonNav.nextLesson : null;
  const nextLessonRoute =
    courseIdParam && nextLesson
      ? routes.lesson.replace(':courseId', courseIdParam).replace(':lessonId', nextLesson.id)
      : null;

  const hasSubmission = submission !== null;
  const isReviewed = submission?.status === 'reviewed';
  const isSubmitted = submission?.status === 'submitted';
  const answersSentToTeacher =
    practiceItems.length > 0 && (answersPersisted || isSubmitted || isReviewed);
  const answersLocked = !isTeacherPreview && (answersPersisted || isSubmitted || isReviewed);

  const retryCompletionRead = () => {
    if (isTeacherPreview || !lessonIdParam || !user?.id) {
      return;
    }

    const versionAtStart = completionVersionRef.current;
    setCompletionRead('loading');

    void getLessonCompletionStatus(lessonIdParam, user.id)
      .then((status) => {
        if (!isMountedRef.current || completionVersionRef.current !== versionAtStart) {
          return;
        }

        setIsLessonCompleted(status.isCompleted);
        setCompletionRead('ready');
      })
      .catch(() => {
        if (!isMountedRef.current || completionVersionRef.current !== versionAtStart) {
          return;
        }

        setCompletionRead('error');
      });
  };

  const isLessonContentReady =
    lesson !== null &&
    typeof courseIdParam === 'string' &&
    sameCourseId(lesson.course_id, courseIdParam);

  const handleCompleteLesson = async () => {
    if (isTeacherPreview || isCompleting || isLessonCompleted || !isLessonContentReady) {
      return;
    }

    if (!lessonIdParam) {
      return;
    }

    const savedAnswers = answersPersisted || isSubmitted || isReviewed;
    const answersPayload = practiceItems.map((item) => ({
      practiceItemId: item.id,
      answerText: practiceAnswers[item.id] ?? '',
    }));

    if (practiceItems.length > 0 && !savedAnswers) {
      const unansweredItemNumbers = answersPayload
        .map((answer, index) => (answer.answerText.trim() ? null : index + 1))
        .filter((itemNumber): itemNumber is number => itemNumber !== null);

      if (unansweredItemNumbers.length > 0) {
        setCompletionMessage('');
        setCompletionError(
          `Заполни все задания перед завершением урока. Не заполнены задания: ${unansweredItemNumbers.join(', ')}.`,
        );
        return;
      }
    }

    setCompletionError('');
    setCompletionMessage('');
    setIsCompleting(true);

    const epoch = finaleEpochRef.current;
    const visitKeyAtRequest = finaleVisitKey;
    const canApply = () => isMountedRef.current && finaleEpochRef.current === epoch;

    try {
      let nextSubmission: LessonSubmission | null = submission;
      let sentAnswers = practiceItems.length > 0 && savedAnswers;

      if (practiceItems.length > 0 && !savedAnswers) {
        await submitLessonAnswers({
          lessonId: lessonIdParam,
          answers: answersPayload,
        });

        if (!canApply()) {
          return;
        }

        sentAnswers = true;
        setAnswersPersisted(true);

        try {
          const nextSubmissionDetails = await getMyLessonSubmission(lessonIdParam);

          if (!canApply()) {
            return;
          }

          nextSubmission = nextSubmissionDetails?.submission ?? null;
          setSubmission(nextSubmission);
        } catch {
          if (!canApply()) {
            return;
          }
        }
      }

      const result = await completeLesson(lessonIdParam);

      if (!canApply()) {
        return;
      }

      completionVersionRef.current += 1;
      setIsLessonCompleted(true);
      setCompletionRead('ready');

      if (nextSubmission?.status === 'reviewed') {
        setCompletionMessage('Урок уже проверен. Можно перейти к результатам.');
      } else if (nextSubmission?.status === 'submitted' || sentAnswers) {
        if (result.completed_now) {
          setCompletionMessage(
            `Урок завершён. Ответы отправлены учителю. Начислено ${result.reward_amount} круток.`,
          );
        } else {
          setCompletionMessage('Этот урок уже был завершён ранее. Ответы отправлены учителю.');
        }
      } else if (result.completed_now) {
        setCompletionMessage(`Урок завершён. Начислено ${result.reward_amount} круток.`);
      } else {
        setCompletionMessage('Этот урок уже был завершён ранее.');
      }

      const finaleCourseId = readAutoFinaleCourseId(
        result,
        courseIdParam,
        user?.id,
        profile?.role,
        isTeacherPreview,
      );

      if (finaleCourseId && user?.id && epoch === finaleEpochRef.current) {
        try {
          const fullyCompleted = await isCourseFullyCompleted(finaleCourseId, user.id);

          if (!fullyCompleted || epoch !== finaleEpochRef.current || !canApply()) {
            return;
          }

          setFinaleUi((current) => {
            if (current.visitKey !== visitKeyAtRequest || current.open || current.autoOpened) {
              return current;
            }

            return {
              visitKey: visitKeyAtRequest,
              open: true,
              courseId: finaleCourseId,
              autoOpened: true,
              giftCourseId: null,
            };
          });
        } catch {
          // completeLesson already succeeded. Keep the reward message and do not retry it.
        }
      }
    } catch (error) {
      if (!canApply()) {
        return;
      }

      setCompletionMessage('');
      setCompletionError(readErrorMessage(error, 'Не удалось завершить урок'));
    } finally {
      if (isMountedRef.current) {
        setIsCompleting(false);
      }
    }
  };

  const completionDetails = answersSentToTeacher
    ? 'Ответы отправлены учителю. Можно продолжать обучение!'
    : 'Можно продолжать обучение!';

  if (!courseIdParam || !lessonIdParam) {
    return (
      <AppLayout allowPageScroll>
        <div className="p-6 text-accent">Course id или lesson id не найден</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout allowPageScroll>
      <div
        ref={topRef}
        id="top"
        className="flex min-w-0 max-w-full flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {isTeacherPreview ? (
          <div className="mb-4 rounded-3xl border border-primary bg-primary-light px-4 py-3 text-text-primary sm:mb-6 sm:px-5 sm:py-4">
            <p className="font-semibold">Режим предпросмотра</p>
            <p className="mt-1 break-words text-sm">
              Так урок будет выглядеть для ученика после публикации. Ответы сохраняются только до
              обновления страницы.
            </p>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
          <div className="min-w-0 max-w-full">
            <p className="text-sm font-medium text-accent">
              {isTeacherPreview ? 'Teacher preview' : 'Student panel'}
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold text-text-primary sm:text-3xl">
              {lesson?.title ?? 'Урок'}
            </h1>
            <p className="mt-2 break-words text-text-secondary">
              {lesson?.description?.trim() || 'Изучай теорию и переходи к практике'}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <Link to={backToCourseRoute} className={surfaceButtonClassName}>
              Назад к курсу
            </Link>

            {isTeacherPreview ? (
              <Link
                to={routes.teacherEditLesson
                  .replace(':courseId', courseIdParam)
                  .replace(':lessonId', lessonIdParam)}
                className={surfaceButtonClassName}
              >
                Вернуться к редактированию
              </Link>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-4 break-words rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent sm:mt-8"
          >
            {errorMessage}
          </p>
        ) : null}

        {hasSubmission ? (
          <div className="mt-4 min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:mt-8 sm:p-5">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold text-text-primary">Статус проверки</h2>
                <p className="mt-1 break-words text-sm text-text-secondary">
                  {isReviewed
                    ? 'Учитель уже проверил этот урок. Можно посмотреть результаты.'
                    : isSubmitted
                      ? 'Ответы отправлены учителю и ждут проверки.'
                      : 'Статус работы обновляется.'}
                </p>
              </div>

              {isReviewed ? (
                <Link to={resultsRoute} className={primaryButtonClassName}>
                  Посмотреть результаты
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <p className="mt-4 text-text-secondary sm:mt-8">Загрузка...</p>
        ) : isLessonContentReady ? (
          <div className="mt-4 flex min-w-0 flex-col gap-4 sm:mt-8 sm:gap-8">
            <section className="min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 flex-1 break-words text-xl font-semibold text-text-primary sm:text-2xl">
                  Теория
                </h2>

                <a href="#lesson-practice" className={ghostButtonClassName}>
                  Перейти к практике
                </a>
              </div>

              <div className="mt-4 min-w-0 max-w-full sm:mt-6">
                <MarkdownRenderer content={lesson?.theory_markdown ?? ''} />
              </div>
            </section>

            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="h-px min-w-0 flex-1 bg-border" />
              <p className="shrink-0 text-sm font-medium uppercase tracking-wide text-text-secondary">
                Практика
              </p>
              <div className="h-px min-w-0 flex-1 bg-border" />
            </div>

            <section
              id="lesson-practice"
              className="min-w-0 scroll-mt-4 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 flex-1 break-words text-xl font-semibold text-text-primary sm:text-2xl">
                  Практика
                </h2>

                <a href="#top" className={ghostButtonClassName}>
                  Наверх
                </a>
              </div>

              <div className="mt-4 min-w-0 sm:mt-6">
                <LessonPracticeBlock
                  items={practiceItems}
                  answers={practiceAnswers}
                  onAnswersChange={setPracticeAnswers}
                  isReadonly={answersLocked}
                />
              </div>

              {isTeacherPreview ? (
                <div className="mt-4 rounded-3xl border border-border bg-background p-4 sm:mt-8 sm:p-5">
                  <h3 className="text-lg font-semibold text-text-primary">Предпросмотр практики</h3>
                  <p className="mt-1 break-words text-sm text-text-secondary">
                    Введённые ответы хранятся только в этой вкладке и не отправляются на сервер.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-border bg-background p-4 sm:mt-8 sm:p-5">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-text-primary">Завершение урока</h3>
                      <p className="mt-1 break-words text-sm text-text-secondary">
                        {isLessonCompleted
                          ? 'Этот урок уже завершён.'
                          : `Заверши урок, чтобы получить новые попытки в гаче.${
                              practiceItems.length > 0
                                ? ' Все задания обязательны, ответы будут отправлены учителю на проверку.'
                                : ''
                            }`}
                      </p>
                      {completionRead === 'error' && !isLessonCompleted ? (
                        <div className="mt-3">
                          <p className="break-words text-sm text-accent" role="alert">
                            Не удалось проверить, пройден ли урок.
                          </p>
                          <button
                            type="button"
                            onClick={retryCompletionRead}
                            className={`${ghostButtonClassName} mt-2`}
                          >
                            Повторить проверку
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isReviewed || !isLessonCompleted ? (
                      <div className="flex w-full flex-col gap-2 sm:w-auto">
                        {isReviewed ? (
                          <Link to={resultsRoute} className={primaryButtonClassName}>
                            Посмотреть результаты
                          </Link>
                        ) : null}
                        {!isLessonCompleted ? (
                          <button
                            type="button"
                            onClick={handleCompleteLesson}
                            disabled={isCompleting}
                            className={primaryButtonClassName}
                          >
                            {isCompleting ? 'Завершаем...' : 'Завершить урок'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {completionError ? (
                    <p
                      role="alert"
                      className="mt-3 break-words rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent"
                    >
                      {completionError}
                    </p>
                  ) : null}
                </div>
              )}

              {!isTeacherPreview && isLessonCompleted ? (
                <div className="mt-4 rounded-3xl border border-primary bg-primary-light p-4 sm:p-5">
                  <h3 className="break-words text-lg font-semibold text-text-primary">
                    Отлично, урок пройден!
                  </h3>
                  <p className="mt-1 break-words text-sm text-text-secondary">{completionDetails}</p>
                  {completionMessage ? (
                    <p role="status" className="mt-3 break-words text-sm text-text-primary">
                      {completionMessage}
                    </p>
                  ) : null}

                  {isCompleting ? (
                    <p role="status" className="mt-4 text-sm text-text-secondary">
                      Подождите...
                    </p>
                  ) : navStatus === 'loading' ? (
                    <p className="mt-4 text-sm text-text-secondary">Загрузка следующего урока...</p>
                  ) : navStatus === 'unavailable' ? (
                    <div className="mt-4">
                      <p className="break-words text-sm text-text-secondary">
                        Не удалось определить следующий урок.
                      </p>
                      <button
                        type="button"
                        onClick={() => setNavAttempt((attempt) => attempt + 1)}
                        className={`${ghostButtonClassName} mt-3`}
                      >
                        Повторить
                      </button>
                    </div>
                  ) : nextLesson && nextLessonRoute ? (
                    <div className="mt-4 min-w-0">
                      <p className="text-sm text-text-secondary">Следующий урок</p>
                      <p className="mt-1 break-words font-medium text-text-primary">{nextLesson.title}</p>
                      <Link to={nextLessonRoute} className={`${primaryButtonClassName} mt-3`}>
                        Перейти к следующему уроку
                      </Link>
                    </div>
                  ) : (
                    <Link to={backToCourseRoute} className={`${surfaceButtonClassName} mt-4`}>
                      Вернуться к курсу
                    </Link>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
      {finaleUi.visitKey === finaleVisitKey && finaleUi.open && finaleUi.courseId ? (
        <CourseFinaleViewer
          key={finaleUi.courseId}
          onClose={() => {
            setFinaleUi((current) => ({ ...current, open: false }));
          }}
          onComplete={() => {
            if (!isTeacherPreview && profile?.role === 'student' && user?.id && finaleUi.courseId) {
              markCourseFinaleCompleted(user.id, finaleUi.courseId);
            }

            setFinaleUi((current) => ({
              ...current,
              open: false,
              giftCourseId: current.courseId,
            }));
          }}
        />
      ) : finaleUi.visitKey === finaleVisitKey && !finaleUi.open && finaleUi.giftCourseId ? (
        <CourseGiftDialog
          key={finaleUi.giftCourseId}
          courseId={finaleUi.giftCourseId}
          mode={isTeacherPreview ? 'teacher-preview' : 'student'}
          onClose={() => {
            setFinaleUi((current) => ({ ...current, giftCourseId: null }));
          }}
          onSaved={() => undefined}
        />
      ) : null}
    </AppLayout>
  );
};
