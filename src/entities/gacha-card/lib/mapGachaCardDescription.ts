import type { GachaCardDescription } from '@/entities/gacha-card/model/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const mapGachaCardDescription = (row: unknown): GachaCardDescription => {
  if (
    !isRecord(row) ||
    typeof row.card_id !== 'string' ||
    row.card_id.length === 0 ||
    typeof row.description !== 'string'
  ) {
    throw new Error('Некорректный ответ описания карты');
  }

  return {
    card_id: row.card_id,
    description: row.description,
  };
};
