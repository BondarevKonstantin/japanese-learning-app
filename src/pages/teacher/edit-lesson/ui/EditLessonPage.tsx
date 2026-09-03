import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AppLayout } from '@/app/layouts/AppLayout';
import { getLessonById } from '@/entities/lesson/api/getLessonById';
import { updateLesson } from '@/entities/lesson/api/updateLesson';
import { insertMarkdownImageAtCursor } from '@/features/lesson-theory-image-upload/lib/insertMarkdownImageAtCursor';
import { routes } from '@/shared/config/routes';
import { uploadLessonTheoryImage } from '@/entities/lesson/api/uploadLessonImage';

export const EditLessonPage = () => {
  const navigate = useNavigate();
  const { courseId: courseIdParam, lessonId: lessonIdParam } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const theoryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [theoryMarkdown, setTheoryMarkdown] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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

  const insertImageIntoTextarea = (imageUrl: string) => {
    const textarea = theoryTextareaRef.current;

    if (!textarea) {
      setTheoryMarkdown((prev) => `${prev}\n![image](${imageUrl})\n`);
      return;
    }

    const selectionStart = textarea.selectionStart ?? theoryMarkdown.length;
    const selectionEnd = textarea.selectionEnd ?? theoryMarkdown.length;

    const { nextValue, nextCursorPosition } = insertMarkdownImageAtCursor({
      currentValue: theoryMarkdown,
      imageUrl,
      selectionStart,
      selectionEnd,
    });

    setTheoryMarkdown(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const handleImageUpload = async (file: File | null) => {
    if (!courseIdParam || !file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Можно загружать только изображения');
      return;
    }

    try {
      setErrorMessage('');
      setIsUploadingImage(true);

      const imageUrl = await uploadLessonTheoryImage({
        file,
      });

      insertImageIntoTextarea(imageUrl);
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

  const handleTheoryPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items?.length) {
      return;
    }

    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));

    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();
    await handleImageUpload(file);
  };

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

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text-primary">Теория (markdown)</span>

                    <div className="flex items-center gap-3">
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
                        {isUploadingImage ? 'Загрузка...' : 'Загрузить изображение'}
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={theoryTextareaRef}
                    value={theoryMarkdown}
                    onChange={(event) => setTheoryMarkdown(event.target.value)}
                    onPaste={(event) => {
                      void handleTheoryPaste(event);
                    }}
                    rows={14}
                    className="rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                    required
                  />

                  <p className="text-sm text-text-secondary">
                    Можно вставить картинку через Ctrl+V. Она загрузится и добавится в текущую
                    позицию курсора.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || isUploadingImage || !title.trim() || !theoryMarkdown.trim()
                    }
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
