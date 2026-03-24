import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/app/layouts/AppLayout';
import { useAuth } from '@/app/providers/auth/useAuth';
import {
  getUserGachaCollection,
  type UserGachaCollectionItem,
} from '@/features/gacha/api/getUserGachaCollection';
import { LogoutButton } from '@/features/logout/ui/LogoutButton';
import type { GachaCardRarity } from '@/entities/gacha-card/model/types';
import { useParams } from 'react-router-dom';

const rarityOptions: Array<GachaCardRarity | 'all'> = [
  'all',
  'common',
  'rare',
  'epic',
  'legendary',
];

const rarityLabelMap: Record<GachaCardRarity, string> = {
  common: 'Обычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная',
};

const rarityFilterLabelMap: Record<GachaCardRarity | 'all', string> = {
  all: 'Все редкости',
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

export const GachaCollectionPage = () => {
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();

  const [cards, setCards] = useState<UserGachaCollectionItem[]>([]);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<GachaCardRarity | 'all'>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadCollection = async () => {
      if (!user?.id) {
        setErrorMessage('Пользователь не найден');
        setIsLoading(false);
        return;
      }

      if (!courseId) return;

      setErrorMessage('');

      try {
        const nextCards = await getUserGachaCollection(courseId, user.id);
        setCards(nextCards);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить коллекцию';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCollection();
  }, [user?.id, courseId]);

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesRarity = rarityFilter === 'all' || card.rarity === rarityFilter;
      const matchesSearch =
        normalizedSearch.length === 0 || card.title.toLowerCase().includes(normalizedSearch);

      return matchesRarity && matchesSearch;
    });
  }, [cards, rarityFilter, search]);

  const totalCards = cards.length;
  const unlockedCards = cards.filter((card) => card.isUnlocked).length;
  const lockedCards = totalCards - unlockedCards;

  if (!courseId) {
    return (
      <AppLayout>
        <div className="p-6 text-accent">Course id не найден</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-accent">Student panel</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">Коллекция карт</h1>
            <p className="mt-2 text-text-secondary">
              Просматривай открытые карты, ищи по названию и фильтруй по редкости
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-primary">Поиск по названию</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
                placeholder="Например, かわいい"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-primary">Редкость</span>
              <select
                value={rarityFilter}
                onChange={(event) => setRarityFilter(event.target.value as GachaCardRarity | 'all')}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-light"
              >
                {rarityOptions.map((option) => (
                  <option key={option} value={option}>
                    {rarityFilterLabelMap[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-background p-4">
              <p className="text-sm text-text-secondary">Всего карт</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{totalCards}</p>
            </div>

            <div className="rounded-3xl border border-border bg-background p-4">
              <p className="text-sm text-text-secondary">Открыто</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{unlockedCards}</p>
            </div>

            <div className="rounded-3xl border border-border bg-background p-4">
              <p className="text-sm text-text-secondary">Закрыто</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{lockedCards}</p>
            </div>

            <div className="rounded-3xl border border-border bg-background p-4">
              <p className="text-sm text-text-secondary">Найдено</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{filteredCards.length}</p>
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-accent bg-secondary px-4 py-3 text-sm text-accent">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <p className="mt-6 text-text-secondary">Загрузка...</p>
          ) : filteredCards.length === 0 ? (
            <p className="mt-6 text-text-secondary">По текущим фильтрам ничего не найдено.</p>
          ) : (
            <div className="mt-6 min-h-0 flex-1 overflow-auto pr-2">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className="overflow-hidden rounded-3xl border border-border bg-background"
                  >
                    <div className="relative aspect-[3/4] bg-surface">
                      <img
                        src={card.image_url}
                        alt={card.isUnlocked ? card.title : 'Закрытая карта'}
                        className={`h-full w-full object-cover transition ${
                          card.isUnlocked ? '' : 'scale-105 blur-[10px] grayscale'
                        }`}
                      />

                      {!card.isUnlocked ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary">
                            Не открыто
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-text-primary">
                            {card.isUnlocked ? card.title : '???'}
                          </h3>

                          <p className="mt-2 text-sm text-text-secondary">
                            {card.isUnlocked ? 'Открыта' : 'Еще не открыта'}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${rarityClassMap[card.rarity]}`}
                        >
                          {rarityLabelMap[card.rarity]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
