import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { Departure } from '@core/models/Departures';
import { DeparturesStoreService } from './departures-store.service';
import { TerritoryDataService } from './territory-data.service';

const buildDeparture = (overrides: Partial<Departure> = {}): Departure => ({
  driver: 'Ana',
  location: 'Plaza',
  territory: [],
  date: '2026-11-02',
  maps: '',
  point: '',
  schedule: '09:00',
  color: '',
  group: 0,
  ...overrides,
});

describe('DeparturesStoreService', () => {
  let weekSource: BehaviorSubject<{ departure: Departure[] } | undefined>;
  let territoryData: {
    getGroupList: ReturnType<typeof vi.fn>;
    getWeeklyDepartures: ReturnType<typeof vi.fn>;
    getWeeklyDeparture: ReturnType<typeof vi.fn>;
    getDepartures: ReturnType<typeof vi.fn>;
  };
  let store: DeparturesStoreService;

  beforeEach(() => {
    weekSource = new BehaviorSubject<{ departure: Departure[] } | undefined>({
      departure: [buildDeparture()],
    });
    territoryData = {
      getGroupList: vi.fn().mockReturnValue(of([{ id: 'Grupo 1', publishers: [] }])),
      getWeeklyDepartures: vi.fn().mockReturnValue(of([])),
      getWeeklyDeparture: vi.fn().mockReturnValue(weekSource),
      getDepartures: vi.fn().mockReturnValue(of({ departure: [] })),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: TerritoryDataService, useValue: territoryData }],
    });
    store = TestBed.inject(DeparturesStoreService);
  });

  it('opens each listener only once however many screens connect', () => {
    store.connect();
    store.connect();

    expect(territoryData.getGroupList).toHaveBeenCalledTimes(1);
    expect(territoryData.getWeeklyDepartures).toHaveBeenCalledTimes(1);
    expect(territoryData.getWeeklyDeparture).toHaveBeenCalledTimes(1);
  });

  it('serves an already loaded week synchronously on re-entry', () => {
    const first = store.weekDepartures('2026-11-02');
    const second = store.weekDepartures('2026-11-02');

    expect(second()).toHaveLength(1);
    expect(territoryData.getWeeklyDeparture).toHaveBeenCalledTimes(1);
    expect(second()).toBe(first());
  });

  it('keeps the same reference when the server re-emits identical data', () => {
    const departures = store.weekDepartures('2026-11-02');
    const before = departures();

    weekSource.next({ departure: [buildDeparture()] });

    expect(departures()).toBe(before);
  });

  it('publishes new data when a departure really changes', () => {
    const departures = store.weekDepartures('2026-11-02');

    weekSource.next({ departure: [buildDeparture({ driver: 'Luis' })] });

    expect(departures()?.[0].driver).toBe('Luis');
  });

  it('stops listening to the least recently used weeks past the limit', () => {
    for (let day = 1; day <= 12; day++) {
      store.weekDepartures(`2026-01-${String(day).padStart(2, '0')}`);
    }

    store.weekDepartures('2026-01-01');

    // 12 distinct weeks + the first one subscribed again after being evicted
    expect(territoryData.getWeeklyDeparture).toHaveBeenCalledTimes(13);
  });
});
