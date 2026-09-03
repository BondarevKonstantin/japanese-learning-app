import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AppLayout } from '@/app/layouts/AppLayout';
import { getLessonById } from '@/entities/lesson/api/getLessonById';
import type { Lesson } from '@/entities/lesson/model/types';
import type {
  LessonSubmission,
  StudentSubmissionProfile,
  TeacherLessonSubmissionReviewItem,
} from '@/entities/lesson-submission/model/types';
import { getLessonSubmissionById } from '@/features/lesson-submission/api/getLessonSubmissionById';
import { reviewLessonSubmission } from '@/features/lesson-submission/api/reviewLessonSubmission';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import { routes } from '@/shared/config/routes';

const formatCorrectAnswer = (value: string | string[]) => {
  if (Array.isArray(value)) {
    return value.join('; ');
  }

  return value;
};

const getStudentDisplayName = (profile: StudentSubmissionProfile | null) =>
  profile?.display_name?.trim() || profile?.email || 'Имя ученика не указано';

export const TeacherLessonSubmissionReviewPage = () => {
  const navigate = useNavigate();
  const {
    courseId: courseIdParam,
    lessonId: lessonIdParam,
    submissionId: submissionIdParam,
  } = useParams<{
    courseId: string;
    lessonId: string;
    submissionId: string;
  }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [submission, setSubmission] = useState<LessonSubmission | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentSubmissionProfile | null>(null);
  const [answers, setAnswers] = useState<TeacherLessonSubmissionReviewItem[]>([]);
  const [teacherComments, setTeacherComments] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!lessonIdParam || !submissionIdParam) {
        setErrorMessage('Lesson id или submission id не найден');
        setIsLoading(false);
        return;
      }

      setErrorMessage('');

      try {
        const [nextLesson, submissionDetails] = await Promise.all([
          getLessonById(lessonIdParam),
          getLessonSubmissionById(submissionIdParam),
        ]);

        setLesson(nextLesson);
        setSubmission(submissionDetails.submission);
        setStudentProfile(submissionDetails.student_profile);
        setAnswers(submissionDetails.answers);

        const nextTeacherComments = submissionDetails.answers.reduce<Record<string, string>>(
          (acc, item) => {
            acc[item.answer_id] = item.teacher_comment ?? '';
            return acc;
          },
          {},
        );

        setTeacherComments(nextTeacherComments);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось загрузить работу ученика';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [lessonIdParam, submissionIdParam]);

  const backToSubmissionsRoute = useMemo(() => {
    if (!courseIdParam || !lessonIdParam) {
      return routes.teacherCourses;
    }

    return routes.teacherLessonSubmissions
      .replace(':courseId', courseIdParam)
      .replace(':lessonId', lessonIdParam);
  }, [courseIdParam, lessonIdParam]);

  const handleCommentChange = (answerId: string, value: string) => {
    setTeacherComments((prev) => ({
      ...prev,
      [answerId]: value,
    }));
  };

  const handleSubmitReview = async () => {
    if (!submissionIdParam) {
      setErrorMessage('Submission id не найден');
      return;
    }

    if (submission?.status === 'reviewed') {
      setErrorMessage('Эта работа уже проверена. Повторная отправка результата недоступна.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await reviewLessonSubmission({
        submissionId: submissionIdParam,
        answers: answers.map((item) => ({
          answerId: item.answer_id,
          teacherComment: teacherComments[item.answer_id] ?? '',
        })),
      });

      navigate(backToSubmissionsRoute);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось отправить результаты ученику';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!courseIdParam || !lessonIdParam || !submissionIdParam) {
    return (
      <AppLayout disableOverflowHidden>
        <div className="p-6 text-accent">Course id, lesson id или submission id не найден</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout disableOverflowHidden>
      <div className="flex min-h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Проверка работы</h1>
            <p className="mt-2 text-text-secondary">
              {lesson ? `Урок: ${lesson.title}` : 'Работа ученика'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={backToSubmissionsRoute}
              className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
            >
              Назад к списку работ
            </Link>

            <LogoutButton />
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-8 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-sm">
          {isLoading ? (
            <p className="text-text-secondary">Загрузка...</p>
          ) : !submission ? (
            <p className="text-text-secondary">Работа не найдена.</p>
          ) : (
            <>
              <div className="rounded-3xl border border-border bg-background p-5">
                <div className="grid gap-2 text-sm text-text-secondary">
                  <p>
                    Ученик:{' '}
                    <span className="text-text-primary">
                      {getStudentDisplayName(studentProfile)}
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
                    Статус:{' '}
                    <span className="text-text-primary">
                      {submission.status === 'reviewed' ? 'Проверено' : 'На проверке'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {answers.map((item, index) => (
                  <div
                    key={item.answer_id}
                    className="rounded-3xl border border-border bg-background p-5"
                  >
                    <p className="text-sm text-text-secondary">Задание {index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold text-text-primary">
                      {item.question}
                    </h3>

                    {item.image_url ? (
                      <div className="mt-4">
                        <img
                          src={item.image_url}
                          alt={`Иллюстрация к заданию ${index + 1}`}
                          className="max-h-[360px] w-full max-w-2xl rounded-2xl border border-border object-contain"
                        />
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-2 text-sm">
                      <p className="text-text-secondary">
                        Ответ ученика:{' '}
                        <span className="text-text-primary">{item.answer_text || '—'}</span>
                      </p>

                      {item.practice_item_type !== 'textarea' ? (
                        <>
                          <p className="text-text-secondary">
                            Правильный ответ:{' '}
                            <span className="text-text-primary">
                              {formatCorrectAnswer(item.correct_answer) || '—'}
                            </span>
                          </p>

                          <p className="text-text-secondary">
                            Автопроверка:{' '}
                            <span className="text-text-primary">
                              {item.is_auto_correct === true
                                ? 'Верно'
                                : item.is_auto_correct === false
                                  ? 'Неверно'
                                  : '—'}
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="text-text-secondary">
                          Формат ответа: <span className="text-text-primary">Свободный ответ</span>
                        </p>
                      )}

                      {item.explanation ? (
                        <p className="text-text-secondary">
                          Пояснение: <span className="text-text-primary">{item.explanation}</span>
                        </p>
                      ) : null}
                    </div>

                    <label className="mt-4 flex flex-col gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        Комментарий учителя
                      </span>
                      <textarea
                        value={teacherComments[item.answer_id] ?? ''}
                        onChange={(event) =>
                          handleCommentChange(item.answer_id, event.target.value)
                        }
                        rows={4}
                        disabled={submission.status === 'reviewed'}
                        className="rounded-2xl border border-border bg-surface px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light disabled:cursor-not-allowed disabled:opacity-70"
                        placeholder="Напиши замечания, исправления или похвалу"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || submission.status === 'reviewed'}
                  className="rounded-2xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submission.status === 'reviewed'
                    ? 'Результат уже отправлен'
                    : isSubmitting
                      ? 'Отправляем...'
                      : 'Отправить результат ученику'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
