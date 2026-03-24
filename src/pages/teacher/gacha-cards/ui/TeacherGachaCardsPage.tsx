import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import { createGachaCard } from '@/entities/gacha-card/api/createGachaCard';
import { deleteGachaCard } from '@/entities/gacha-card/api/deleteGachaCard';
import { getGachaCardsByCourse } from '@/entities/gacha-card/api/getGachaCardsByCourse';
import type { GachaCard, GachaCardRarity } from '@/entities/gacha-card/model/types';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
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

  const [cards, setCards] = useState<GachaCard[]>([]);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [rarity, setRarity] = useState<GachaCardRarity>('common');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadCards = useCallback(async () => {
    setErrorMessage('');

    if (!courseId) return;

    try {
      const nextCards = await getGachaCardsByCourse(courseId);
      setCards(nextCards);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить карты';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      setErrorMessage('Пользователь не найден');
      return;
    }

    if (!courseId) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await createGachaCard({
        courseId: courseId,
        title,
        imageUrl,
        rarity,
        createdBy: user.id,
      });

      setTitle('');
      setImageUrl('');
      setRarity('common');

      await loadCards();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать карту';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      await deleteGachaCard(cardId);
      await loadCards();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить карту';
      setErrorMessage(message);
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
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Teacher panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Гача-карты</h1>
            <p className="mt-2 text-text-secondary">Добавление и просмотр карт для курса</p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 grid min-h-0 flex-1 gap-8 lg:grid-cols-[360px_1fr]">
          <div className="flex h-full flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
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

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-primary">Ссылка на картинку</span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                  placeholder="https://..."
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-primary">Редкость</span>
                <select
                  value={rarity}
                  onChange={(event) => setRarity(event.target.value as GachaCardRarity)}
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                >
                  {rarityOptions.map((option) => (
                    <option key={option} value={option}>
                      {rarityLabelMap[option]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-auto" />

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 rounded-2xl bg-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Создание...' : 'Создать карту'}
              </button>
            </form>

            {errorMessage ? (
              <p className="mt-4 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
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
                    <div
                      key={card.id}
                      className="overflow-hidden rounded-3xl border border-border bg-background"
                    >
                      <div className="aspect-[3/4] bg-surface">
                        <img
                          src={card.image_url}
                          alt={card.title}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-text-primary">{card.title}</h3>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${rarityClassMap[card.rarity]}`}
                          >
                            {rarityLabelMap[card.rarity]}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(card.id)}
                          className="mt-4 w-full rounded-2xl border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-secondary"
                        >
                          Удалить
                        </button>
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
