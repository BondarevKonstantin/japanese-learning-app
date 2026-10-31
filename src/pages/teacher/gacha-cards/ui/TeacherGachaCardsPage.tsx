import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import { createGachaCard } from '@/entities/gacha-card/api/createGachaCard';
import {
  deleteStoredGachaCardImageIfOwned,
  removeGachaCardImage,
  uploadGachaCardImage,
} from '@/entities/gacha-card/api/gachaCardImageStorage';
import { deleteGachaCard } from '@/entities/gacha-card/api/deleteGachaCard';
import { getGachaCardsByCourse } from '@/entities/gacha-card/api/getGachaCardsByCourse';
import { updateGachaCardRarity } from '@/entities/gacha-card/api/updateGachaCardRarity';
import { readGachaCardImageFile } from '@/entities/gacha-card/lib/readGachaCardImageFile';
import {
  createDefaultGachaImageTransform,
  normalizeGachaImageTransform,
} from '@/entities/gacha-card/model/imageTransform';
import type { ImageSize } from '@/entities/gacha-card/model/imageTransform';
import type {
  GachaCard as GachaCardData,
  GachaCardRarity,
  GachaImageTransform,
} from '@/entities/gacha-card/model/types';
import { GachaCard } from '@/entities/gacha-card/ui/GachaCard';
import type { CourseGachaConfig } from '@/entities/gacha/model/types';
import { GachaImageEditor } from '@/features/gacha-image-editor/ui/GachaImageEditor';
import { finalizeCourseGacha } from '@/features/gacha/api/finalizeCourseGacha';
import { getCourseGachaConfig } from '@/features/gacha/api/getCourseGachaConfig';
import { useParams } from 'react-router-dom';

const rarityOptions: GachaCardRarity[] = ['common', 'rare', 'epic', 'legendary'];

const rarityLabelMap: Record<GachaCardRarity, string> = {
  common: 'Обычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная',
};

const rarityClassMap: Record<GachaCardRarity, string> = {
  common: 'border-border bg-background text-text-primary',
  rare: 'border-primary bg-primary-light text-text-primary',
  epic: 'border-accent bg-secondary text-accent',
  legendary: 'border-accent bg-accent text-white',
};

export const TeacherGachaCardsPage = () => {
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();

  const [cards, setCards] = useState<GachaCardData[]>([]);
  const [gachaConfig, setGachaConfig] = useState<CourseGachaConfig | null>(null);
  const [title, setTitle] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transform, setTransform] = useState<GachaImageTransform>(
    createDefaultGachaImageTransform(),
  );
  const [rarity, setRarity] = useState<GachaCardRarity>('common');

  const [isLoading, setIsLoading] = useState(true);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [rarityUpdatingCardId, setRarityUpdatingCardId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileRequestRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);
  const readingImageRef = useRef(false);
  const submitLockRef = useRef(false);

  const replacePreviewUrl = (nextUrl: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  };

  const loadPageData = useCallback(async (targetCourseId: string) => {
    try {
      const [nextCards, nextConfig] = await Promise.all([
        getGachaCardsByCourse(targetCourseId),
        getCourseGachaConfig(targetCourseId),
      ]);

      setErrorMessage('');
      setCards(nextCards);
      setGachaConfig(nextConfig);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить данные гачи';
      setErrorMessage(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      fileRequestRef.current += 1;

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!courseId) {
      return;
    }

    // State updates happen after the asynchronous Supabase request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPageData(courseId);
  }, [courseId, loadPageData]);

  const isFinalized = gachaConfig?.status === 'finalized';

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || submitLockRef.current) {
      return;
    }

    const requestId = ++fileRequestRef.current;
    readingImageRef.current = true;
    setIsReadingImage(true);
    setErrorMessage('');
    setImageFile(null);
    setImageSize(null);
    setTransform(createDefaultGachaImageTransform());
    replacePreviewUrl(null);

    try {
      const nextImageSize = await readGachaCardImageFile(file);

      if (requestId !== fileRequestRef.current) {
        return;
      }

      const nextPreviewUrl = URL.createObjectURL(file);

      if (requestId !== fileRequestRef.current) {
        URL.revokeObjectURL(nextPreviewUrl);
        return;
      }

      replacePreviewUrl(nextPreviewUrl);
      setImageFile(file);
      setImageSize(nextImageSize);
      setTransform(createDefaultGachaImageTransform());
    } catch (error) {
      if (requestId !== fileRequestRef.current) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Не удалось прочитать изображение';
      setErrorMessage(message);
    } finally {
      if (requestId === fileRequestRef.current) {
        readingImageRef.current = false;
        setIsReadingImage(false);
      }
    }
  };

  const handleFormRarityChange = (nextRarity: GachaCardRarity) => {
    setRarity(nextRarity);

    if (!imageSize) {
      return;
    }

    setTransform((currentTransform) =>
      normalizeGachaImageTransform(currentTransform, imageSize, nextRarity),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitLockRef.current || readingImageRef.current) {
      return;
    }

    if (!user?.id) {
      setErrorMessage('Пользователь не найден');
      return;
    }

    if (!courseId) return;

    if (isFinalized) {
      setErrorMessage('Финализированную коллекцию нельзя пополнять.');
      return;
    }

    if (!imageFile || !imageSize) {
      setErrorMessage('Выберите изображение');
      return;
    }

    const imageTransform = normalizeGachaImageTransform(transform, imageSize, rarity);
    submitLockRef.current = true;
    setErrorMessage('');
    setIsSubmitting(true);

    let uploadedPath: string | null = null;

    try {
      const uploadedImage = await uploadGachaCardImage({
        file: imageFile,
        courseId,
      });
      uploadedPath = uploadedImage.path;

      await createGachaCard({
        courseId,
        title,
        imageUrl: uploadedImage.publicUrl,
        imageTransform,
        rarity,
        createdBy: user.id,
      });

      setTitle('');
      setRarity('common');
      setImageFile(null);
      setImageSize(null);
      setTransform(createDefaultGachaImageTransform());
      replacePreviewUrl(null);

      await loadPageData(courseId);
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Не удалось создать карту';

      if (uploadedPath) {
        try {
          await removeGachaCardImage(uploadedPath);
        } catch {
          message = `${message} Загруженный файл мог остаться в хранилище.`;
        }
      }

      setErrorMessage(message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (card: GachaCardData) => {
    if (!courseId) return;

    if (isFinalized) {
      setErrorMessage('Карты финализированной коллекции нельзя удалять.');
      return;
    }

    try {
      await deleteGachaCard(card.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить карту';
      setErrorMessage(message);
      return;
    }

    let cleanupFailed = false;

    try {
      await deleteStoredGachaCardImageIfOwned(card.image_url, card.course_id);
    } catch {
      cleanupFailed = true;
    }

    const loaded = await loadPageData(courseId);

    if (cleanupFailed) {
      setErrorMessage(
        loaded
          ? 'Карта удалена, но файл изображения мог остаться в хранилище.'
          : 'Карта удалена, но файл изображения мог остаться в хранилище. Не удалось обновить галерею.',
      );
    }
  };

  const handleRarityChange = async (cardId: string, nextRarity: GachaCardRarity) => {
    if (isFinalized) {
      setErrorMessage('Редкость карты нельзя менять после финализации.');
      return;
    }

    setErrorMessage('');
    setRarityUpdatingCardId(cardId);

    try {
      const updatedCard = await updateGachaCardRarity({
        cardId,
        rarity: nextRarity,
      });

      setCards((currentCards) =>
        currentCards.map((card) => (card.id === updatedCard.id ? updatedCard : card)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось изменить редкость карты';
      setErrorMessage(message);
    } finally {
      setRarityUpdatingCardId(null);
    }
  };

  const handleFinalize = async () => {
    if (!courseId || isFinalized) {
      return;
    }

    const isConfirmed = window.confirm(
      'После финализации нельзя будет добавлять и удалять карты, менять их редкость, а также добавлять и удалять уроки курса. Продолжить?',
    );

    if (!isConfirmed) {
      return;
    }

    setErrorMessage('');
    setIsFinalizing(true);

    try {
      const finalizedConfig = await finalizeCourseGacha(courseId);
      setGachaConfig(finalizedConfig);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось финализировать коллекцию';
      setErrorMessage(message);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!courseId) {
    return (
      <AppLayout>
        <div className="p-6 text-accent">Course id не найден в URL</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col max-lg:overflow-y-auto">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Гача-карты</h1>
            <p className="mt-2 text-text-secondary">Добавление и просмотр карт для курса</p>
          </div>

          {isFinalized ? (
            <div className="w-full rounded-2xl border border-primary bg-primary-light px-4 py-3 text-sm text-text-primary sm:w-auto">
              <p className="font-semibold">Коллекция финализирована</p>
              <p className="mt-1 text-text-secondary">
                {gachaConfig.cards_count} карт · {gachaConfig.reward_lessons_count} уроков ·{' '}
                {gachaConfig.pulls_per_lesson} попыток за урок · {gachaConfig.cards_per_pull} карт
                за попытку
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isLoading || isFinalizing}
              className="min-h-11 w-full rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isFinalizing ? 'Финализация...' : 'Финализировать карточки курса'}
            </button>
          )}
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
            {errorMessage}
          </p>
        ) : null}

        <div
          className={`mt-8 grid min-h-0 gap-8 max-lg:flex-none lg:min-h-0 lg:flex-1 lg:overflow-hidden ${
            isFinalized ? '' : 'lg:grid-cols-[360px_1fr]'
          }`}
        >
          {!isFinalized ? (
            <div className="flex min-h-0 min-w-0 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm lg:h-full lg:overflow-y-auto">
              <h2 className="text-xl font-semibold text-text-primary">Добавить карту</h2>

              <form className="mt-6 flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Название</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                    placeholder="Например, かわいい"
                    required
                  />
                </label>

                <label className="flex min-w-0 flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Изображение</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      void handleFileChange(event);
                    }}
                    disabled={isSubmitting || isReadingImage}
                    className="block w-full min-w-0 text-sm text-text-primary file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  />
                  <span className="text-xs text-text-secondary">
                    PNG, JPEG или WebP, не больше 5 МБ
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-text-primary">Редкость</span>
                  <select
                    value={rarity}
                    onChange={(event) =>
                      handleFormRarityChange(event.target.value as GachaCardRarity)
                    }
                    disabled={isSubmitting}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                  >
                    {rarityOptions.map((option) => (
                      <option key={option} value={option}>
                        {rarityLabelMap[option]}
                      </option>
                    ))}
                  </select>
                </label>

                {previewUrl && imageSize ? (
                  <GachaImageEditor
                    key={previewUrl}
                    imageUrl={previewUrl}
                    imageSize={imageSize}
                    rarity={rarity}
                    transform={transform}
                    alt={title.trim() || 'Предпросмотр карты'}
                    onTransformChange={setTransform}
                  />
                ) : null}

                <div className="mt-auto" />

                <button
                  type="submit"
                  disabled={isSubmitting || isReadingImage}
                  className="mt-2 rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Создание...' : 'Создать карту'}
                </button>
              </form>
            </div>
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm lg:h-full">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-text-primary">Галерея карт</h2>
              <p className="text-sm text-text-secondary">Всего: {cards.length}</p>
            </div>

            {isLoading ? (
              <p className="mt-6 text-text-secondary">Загрузка...</p>
            ) : cards.length === 0 ? (
              <p className="mt-6 text-text-secondary">У этого курса пока нет карт.</p>
            ) : (
              <div className="mt-6 min-h-0 flex-1 overflow-auto pr-2">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {cards.map((card) => (
                    <div key={card.id} className="rounded-3xl border border-border bg-background">
                      <div className="px-3 pt-3">
                        <GachaCard
                          rarity={card.rarity}
                          imageUrl={card.image_url}
                          alt={card.title}
                          imageTransform={card.image_transform}
                        />
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-text-primary">{card.title}</h3>
                          </div>

                          {isFinalized ? (
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${rarityClassMap[card.rarity]}`}
                            >
                              {rarityLabelMap[card.rarity]}
                            </span>
                          ) : (
                            <select
                              value={card.rarity}
                              onChange={(event) =>
                                handleRarityChange(card.id, event.target.value as GachaCardRarity)
                              }
                              disabled={rarityUpdatingCardId === card.id}
                              aria-label={`Редкость карты ${card.title}`}
                              className="rounded-xl border border-border bg-surface px-2 py-1 text-xs text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {rarityOptions.map((option) => (
                                <option key={option} value={option}>
                                  {rarityLabelMap[option]}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {!isFinalized ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(card)}
                            className="mt-4 w-full rounded-2xl border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-secondary"
                          >
                            Удалить
                          </button>
                        ) : null}
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
