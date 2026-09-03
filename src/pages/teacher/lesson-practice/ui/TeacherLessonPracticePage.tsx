import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AppLayout } from '@/app/layouts/AppLayout';
import { getLessonById } from '@/entities/lesson/api/getLessonById';
import type { Lesson } from '@/entities/lesson/model/types';
import { createLessonPracticeItem } from '@/entities/lesson-practice/api/createLessonPracticeItem';
import { deleteLessonPracticeItem } from '@/entities/lesson-practice/api/deleteLessonPracticeItem';
import { getLessonPracticeItems } from '@/entities/lesson-practice/api/getLessonPracticeItems';
import { updateLessonPracticeItem } from '@/entities/lesson-practice/api/updateLessonPracticeItem';
import type {
  LessonPracticeItem,
  LessonPracticeItemType,
} from '@/entities/lesson-practice/model/types';
import { uploadPracticeItemImage } from '@/entities/lesson-practice/api/uploadPracticeItemImage';
import { routes } from '@/shared/config/routes';

const typeOptions: LessonPracticeItemType[] = ['multiple_choice', 'input', 'textarea'];

const typeLabelMap: Record<LessonPracticeItemType, string> = {
  multiple_choice: 'Выбор варианта',
  input: 'Ввод ответа',
  textarea: 'Свободный ответ',
};

export const TeacherLessonPracticePage = () => {
  const { courseId: courseIdParam, lessonId: lessonIdParam } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [items, setItems] = useState<LessonPracticeItem[]>([]);

  const [type, setType] = useState<LessonPracticeItemType>('multiple_choice');
  const [question, setQuestion] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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
        const [nextLesson, nextItems] = await Promise.all([
          getLessonById(lessonIdParam),
          getLessonPracticeItems(lessonIdParam),
        ]);

        setLesson(nextLesson);
        setItems(nextItems);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить практику';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [lessonIdParam]);

  const submissionsRoute = useMemo(() => {
    if (!courseIdParam || !lessonIdParam) {
      return routes.teacherCourses;
    }

    return routes.teacherLessonSubmissions
      .replace(':courseId', courseIdParam)
      .replace(':lessonId', lessonIdParam);
  }, [courseIdParam, lessonIdParam]);

  if (!courseIdParam || !lessonIdParam) {
    return (
      <AppLayout>
        <div className="p-6 text-accent">Course id или lesson id не найден</div>
      </AppLayout>
    );
  }

  const loadItems = async () => {
    try {
      const nextItems = await getLessonPracticeItems(lessonIdParam);
      setItems(nextItems);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить задания';
      setErrorMessage(message);
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!lessonIdParam || !file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Можно загружать только изображения');
      return;
    }

    try {
      setErrorMessage('');
      setIsUploadingImage(true);

      const nextImageUrl = await uploadPracticeItemImage({
        file,
        lessonId: lessonIdParam,
      });

      setImageUrl(nextImageUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить изображение';
      setErrorMessage(message);
    } finally {
      setIsUploadingImage(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedOptions =
      type === 'multiple_choice'
        ? optionsText
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
        : null;

    if (type === 'multiple_choice' && (!normalizedOptions || normalizedOptions.length < 2)) {
      setErrorMessage('Для задания с вариантами нужно минимум 2 варианта ответа');
      return;
    }

    if (type !== 'textarea' && !correctAnswer.trim()) {
      setErrorMessage('Укажи правильный ответ');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (editingItemId) {
        await updateLessonPracticeItem({
          itemId: editingItemId,
          type,
          question: question.trim(),
          options: normalizedOptions,
          correctAnswer: type === 'textarea' ? '' : correctAnswer.trim(),
          explanation,
          imageUrl,
        });
      } else {
        await createLessonPracticeItem({
          lessonId: lessonIdParam,
          type,
          question: question.trim(),
          options: normalizedOptions,
          correctAnswer: type === 'textarea' ? '' : correctAnswer.trim(),
          explanation,
          imageUrl,
        });
      }

      resetForm();
      await loadItems();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : editingItemId
            ? 'Не удалось обновить задание'
            : 'Не удалось создать задание';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteLessonPracticeItem(itemId);
      await loadItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить задание';
      setErrorMessage(message);
    }
  };

  const handleStartEdit = (item: LessonPracticeItem) => {
    setEditingItemId(item.id);
    setType(item.type);
    setQuestion(item.question);
    setOptionsText(item.options?.join('\n') ?? '');
    setCorrectAnswer(
      Array.isArray(item.correct_answer) ? item.correct_answer.join('; ') : item.correct_answer,
    );
    setExplanation(item.explanation ?? '');
    setImageUrl(item.image_url ?? null);
  };

  const resetForm = () => {
    setEditingItemId(null);
    setType('multiple_choice');
    setQuestion('');
    setOptionsText('');
    setCorrectAnswer('');
    setExplanation('');
    setImageUrl(null);
  };

  return (
    <AppLayout disableOverflowHidden>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Практика урока</h1>
            <p className="mt-2 text-text-secondary">
              {lesson ? `Урок: ${lesson.title}` : 'Добавляй задания для урока'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={submissionsRoute}
              className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
            >
              Проверка работ
            </Link>

          </div>
        </div>

        <div className="mt-8 grid min-h-0 flex-1 gap-8 lg:grid-cols-[420px_1fr]">
          <div className="flex h-full flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-text-primary">Добавить задание</h2>

            <form className="mt-6 flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-primary">Тип</span>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as LessonPracticeItemType)}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                >
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {typeLabelMap[option]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-primary">Вопрос</span>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={4}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                  placeholder={
                    type === 'textarea'
                      ? 'Например, Напиши небольшое сочинение о своём дне'
                      : 'Например, Как читается かわいい?'
                  }
                  required
                />
              </label>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    Изображение к вопросу
                  </span>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handleImageUpload(file);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUploadingImage ? 'Загрузка...' : 'Загрузить фото'}
                    </button>

                    {imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="rounded-2xl border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-secondary"
                      >
                        Удалить
                      </button>
                    ) : null}
                  </div>
                </div>

                <p className="text-sm text-text-secondary">
                  Одна фотография на вопрос, необязательно.
                </p>

                {imageUrl ? (
                  <div className="mt-2">
                    <img
                      src={imageUrl}
                      alt="Превью изображения вопроса"
                      className="max-h-[260px] w-full rounded-2xl border border-border object-contain"
                    />
                  </div>
                ) : null}
              </div>

              {type === 'multiple_choice' ? (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Варианты ответа</span>
                  <textarea
                    value={optionsText}
                    onChange={(event) => setOptionsText(event.target.value)}
                    rows={5}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                    placeholder={`kawaii\nkawai\nyasashii`}
                    required
                  />
                </label>
              ) : null}

              {type !== 'textarea' ? (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-text-primary">Правильный ответ</span>
                    <input
                      type="text"
                      value={correctAnswer}
                      onChange={(event) => setCorrectAnswer(event.target.value)}
                      className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                      placeholder={type === 'input' ? 'Например, 行く; いく' : 'Например, kawaii'}
                      required
                    />
                  </label>

                  {type === 'input' ? (
                    <p className="-mt-1 text-sm text-text-secondary">
                      Если правильных вариантов несколько, разделяй их точкой с запятой.
                      Поддерживаются оба варианта: ; и ；
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-secondary">
                  Для задания со свободным ответом правильный ответ не нужен. Его учитель проверяет
                  вручную.
                </div>
              )}

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-primary">Пояснение</span>
                <textarea
                  value={explanation}
                  onChange={(event) => setExplanation(event.target.value)}
                  rows={4}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                  placeholder="Необязательно"
                />
              </label>

              <div className="mt-auto" />

              <button
                type="submit"
                disabled={isSubmitting || isUploadingImage || !question.trim()}
                className="mt-2 rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? editingItemId
                    ? 'Сохранение...'
                    : 'Создание...'
                  : editingItemId
                    ? 'Сохранить изменения'
                    : 'Добавить задание'}
              </button>
            </form>

            {editingItemId ? (
              <button
                type="button"
                onClick={resetForm}
                className="mt-2 rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-text-primary transition hover:bg-background"
              >
                Отмена
              </button>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-text-primary">Список заданий</h2>
              <p className="text-sm text-text-secondary">Всего: {items.length}</p>
            </div>

            {isLoading ? (
              <p className="mt-6 text-text-secondary">Загрузка...</p>
            ) : items.length === 0 ? (
              <p className="mt-6 text-text-secondary">У этого урока пока нет практики.</p>
            ) : (
              <div className="mt-6 min-h-0 flex-1 overflow-auto pr-2">
                <div className="grid gap-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-border bg-background p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-text-secondary">
                            Задание {index + 1} · {typeLabelMap[item.type]}
                          </p>

                          <h3 className="mt-1 font-semibold text-text-primary">{item.question}</h3>

                          {item.image_url ? (
                            <div className="mt-3">
                              <img
                                src={item.image_url}
                                alt={`Иллюстрация к заданию ${index + 1}`}
                                className="max-h-[220px] w-full max-w-xl rounded-2xl border border-border object-contain"
                              />
                            </div>
                          ) : null}

                          {item.type === 'multiple_choice' && item.options?.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.options.map((option) => (
                                <span
                                  key={option}
                                  className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-primary"
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <p className="mt-3 text-sm text-text-secondary">
                            Правильный ответ:{' '}
                            <span className="text-text-primary">
                              {item.type === 'textarea'
                                ? 'Проверяется вручную'
                                : Array.isArray(item.correct_answer)
                                  ? item.correct_answer.join('; ')
                                  : item.correct_answer || '—'}
                            </span>
                          </p>

                          {item.explanation ? (
                            <p className="mt-2 text-sm text-text-secondary">
                              Пояснение: {item.explanation}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="shrink-0 rounded-2xl border border-border px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface"
                          >
                            Редактировать
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="shrink-0 rounded-2xl border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-secondary"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
