import { describe, it, expect } from 'vitest';
import {
  normalizeTerritoryNumberData,
  normalizeTerritoryNumberDataList,
} from './territory-number-data.utils';

describe('territory-number-data.utils', () => {
  it('accepts numeric territorio', () => {
    expect(normalizeTerritoryNumberData({ collection: 'TerritorioW-5', territorio: 5 })).toEqual({
      collection: 'TerritorioW-5',
      territorio: 5,
    });
  });

  it('accepts numeric-string territorio as written by setup-congregation.js', () => {
    expect(normalizeTerritoryNumberData({ collection: 'TerritorioW-5', territorio: '5' })).toEqual({
      collection: 'TerritorioW-5',
      territorio: 5,
    });
  });

  it.each([
    null,
    'x',
    {},
    { collection: '', territorio: 1 },
    { collection: 'A', territorio: '' },
    { collection: 'A', territorio: 'abc' },
    { nombre: '', distancia: '' },
  ])('rejects invalid entry %j', (value) => {
    expect(normalizeTerritoryNumberData(value)).toBeNull();
  });

  it('returns an empty list for non-arrays and drops invalid entries', () => {
    expect(normalizeTerritoryNumberDataList(undefined)).toEqual([]);
    expect(
      normalizeTerritoryNumberDataList([
        { collection: 'A-1', territorio: '1' },
        { nombre: '' },
        { collection: 'A-2', territorio: 2 },
      ]),
    ).toEqual([
      { collection: 'A-1', territorio: 1 },
      { collection: 'A-2', territorio: 2 },
    ]);
  });
});
