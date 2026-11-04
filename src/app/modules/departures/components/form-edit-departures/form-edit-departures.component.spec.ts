import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { FormEditDeparturesComponent } from './form-edit-departures.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Card } from '@core/models/Card';
import { environment } from '@environments/environment';

describe('FormEditDeparturesComponent', () => {
  let component: FormEditDeparturesComponent;
  let fixture: ComponentFixture<FormEditDeparturesComponent>;
  let territoryDataService: TerritoryDataService;

  const locality = environment.localities.find((loc) => loc.hasNumberedTerritories)!;
  const prefix = locality.territoryPrefix;
  const daysAgo = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormEditDeparturesComponent],
    });
    fixture = TestBed.createComponent(FormEditDeparturesComponent);
    component = fixture.componentInstance;
    territoryDataService = TestBed.inject(TerritoryDataService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('computes completion days for territories stored with a string number', async () => {
    vi.spyOn(territoryDataService, 'getRecentCardsFromServer').mockResolvedValue([
      { id: 'reset', end: '0' },
      { id: 'done', end: daysAgo(3) },
    ] as Card[]);

    await component.loadAllTerritoryCompletionData({
      [locality.key]: [{ collection: `${prefix}-5`, territorio: '5' }],
    });

    expect(component.territoryLastCompletedDays()[prefix][5]).toBe(3);
    expect(component.territoryCompletionDataStatus()[prefix]).toBe('ready');
  });

  it('refreshes when the modal is opened again after a newer completion', async () => {
    const readCards = vi.spyOn(territoryDataService, 'getRecentCardsFromServer');
    readCards.mockResolvedValueOnce([{ id: 'a', end: daysAgo(120) }] as Card[]);
    component.numberTerritoryData = {
      [locality.key]: [{ collection: `${prefix}-5`, territorio: '5' }],
    };
    await component.loadAllTerritoryCompletionData(component.numberTerritoryData);
    expect(component.territoryLastCompletedDays()[prefix][5]).toBe(120);

    readCards.mockResolvedValueOnce([{ id: 'b', end: daysAgo(2) }] as Card[]);
    await component.loadAllTerritoryCompletionData(component.numberTerritoryData);
    expect(component.territoryLastCompletedDays()[prefix][5]).toBe(2);
  });

  it('keeps the last known values and flags an error when the server read fails', async () => {
    const data = { [locality.key]: [{ collection: `${prefix}-5`, territorio: 5 }] };
    const readCards = vi.spyOn(territoryDataService, 'getRecentCardsFromServer');
    readCards.mockResolvedValueOnce([{ id: 'a', end: daysAgo(4) }] as Card[]);
    await component.loadAllTerritoryCompletionData(data);

    readCards.mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(component.loadAllTerritoryCompletionData(data)).rejects.toThrow();

    expect(component.territoryLastCompletedDays()[prefix][5]).toBe(4);
    expect(component.territoryCompletionDataStatus()[prefix]).toBe('error');
  });

  it('does not wipe known values when the territory list is empty', async () => {
    component.territoryLastCompletedDays.set({ [prefix]: { 5: 9 } });

    await component.loadAllTerritoryCompletionData({ [locality.key]: [] });

    expect(component.territoryLastCompletedDays()[prefix][5]).toBe(9);
  });
});
