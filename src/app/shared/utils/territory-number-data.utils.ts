import { TerritoryNumberData } from '@core/models/TerritoryNumberData';

/**
 * Accepts the raw `NumberTerritory` entries as stored in Firestore, where `territorio`
 * may be a number or a numeric string (setup-congregation.js writes strings).
 */
export function normalizeTerritoryNumberData(value: unknown): TerritoryNumberData | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const collectionName = record['collection'];
  const rawNumber = record['territorio'];
  if (typeof collectionName !== 'string' || collectionName.trim() === '') return null;

  const territoryNumber =
    typeof rawNumber === 'string' && rawNumber.trim() !== '' ? Number(rawNumber) : rawNumber;
  if (typeof territoryNumber !== 'number' || !Number.isFinite(territoryNumber)) return null;

  return { collection: collectionName, territorio: territoryNumber };
}

export function normalizeTerritoryNumberDataList(values: unknown): TerritoryNumberData[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeTerritoryNumberData(value))
    .filter((territory): territory is TerritoryNumberData => territory !== null);
}
