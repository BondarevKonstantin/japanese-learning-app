import { uploadLessonTheoryImage } from '@/entities/lesson/api/uploadLessonImage';
import { insertMarkdownImage } from '@/features/lesson/utils/insertMarkdownImage';
import { useRef, useState } from 'react';

type LessonTheoryImageUploadProps = {
  userId: string;
  lessonId?: string;
  markdownValue: string;
  onChangeMarkdown: (value: string) => void;
};

export const LessonTheoryImageUpload = ({
  userId,
  lessonId,
  markdownValue,
  onChangeMarkdown,
}: LessonTheoryImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFiles = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Можно загружать только изображения');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);

      const imageUrl = await uploadLessonTheoryImage({
        file,
        userId,
        lessonId,
      });

      onChangeMarkdown(
        insertMarkdownImage({
          currentValue: markdownValue,
          imageUrl,
        }),
      );
    } catch {
      setErrorMessage('Не удалось загрузить изображение');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
        >
          {isUploading ? 'Загрузка...' : 'Загрузить изображение'}
        </button>

        <div className="text-sm text-text-secondary">
          Можно выбрать файл или вставить картинку через Ctrl+V
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleFiles(file);
        }}
      />

      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
