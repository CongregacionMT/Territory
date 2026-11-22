import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { FormEditDeparturesComponent } from './form-edit-departures.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Card } from '@core/models/Card';
import { Departure } from '@core/models/Departures';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
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

  let snackAction: Subject<void>;

  beforeEach(() => {
    snackAction = new Subject<void>();
    TestBed.configureTestingModule({
      imports: [FormEditDeparturesComponent],
      providers: [
        {
          provide: MatSnackBar,
          useValue: { open: vi.fn(() => ({ onAction: () => snackAction.asObservable() })) },
        },
      ],
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

  it('sorts drivers by the name shown in the list', () => {
    const getUsers = vi.fn(() =>
      of([
        { user: 'aaa', displayName: 'Zulema' },
        { user: 'zzz', displayName: 'Ana' },
        { user: 'mmm' },
      ]),
    );
    (territoryDataService as unknown as Record<string, unknown>)['getUsers'] = getUsers;

    component.loadDrivers();

    expect(component.drivers().map((driver) => driver.displayName || driver.user)).toEqual([
      'Ana',
      'mmm',
      'Zulema',
    ]);
  });

  describe('editing a week', () => {
    const WEEK = '2026-11-09';
    const saved = (overrides: Partial<Departure> = {}): Departure => ({
      driver: 'Ana',
      location: prefix,
      territory: ['N°1'],
      date: '2026-11-10',
      maps: '',
      point: 'Plaza',
      schedule: '18:30',
      color: 'info',
      group: 0,
      cardStatus: 'received',
      departureId: 'dep-a',
      ...overrides,
    });

    const load = (departures: Departure[]): void => {
      fixture.componentRef.setInput('dateDepartureInput', WEEK);
      fixture.componentRef.setInput('formDepartureDataInput', departures);
      fixture.detectChanges();
    };

    let service: Record<string, unknown>;

    beforeEach(() => {
      service = territoryDataService as unknown as Record<string, unknown>;
      service['createDepartureId'] = vi.fn(
        (_week: string, _d: Departure, index: number) => `generated-${index}`,
      );
      service['normalizeDepartureForCardTracking'] = vi.fn((d: Departure) => d);
      service['saveWeeklyDepartureKeepingCardStatus'] = vi.fn((week: { departure: Departure[] }) =>
        Promise.resolve(week.departure),
      );
    });

    const lastSavedWeek = (): { weekId: string; departure: Departure[] } =>
      (service['saveWeeklyDepartureKeepingCardStatus'] as ReturnType<typeof vi.fn>).mock
        .calls[0][0];

    it('frames general and group departures in different colors', () => {
      load([
        saved({ departureId: 'dep-a' }),
        saved({ departureId: 'dep-b', group: 1 }),
        saved({ departureId: 'dep-c', group: 2 }),
      ]);

      const sections = fixture.nativeElement.querySelectorAll('section');
      expect(sections).toHaveLength(3);
      expect(sections[0].textContent).toContain('Salidas Generales');
      expect(sections[0].classList).toContain('border-emerald-400/70');
      expect(sections[1].classList).toContain('border-sky-400/70');
      expect(sections[2].classList).toContain('border-cyan-400/70');
    });

    it('starts clean after loading a week', () => {
      load([saved()]);

      expect(component.isFormDirty()).toBe(false);
      expect(component.getCurrentDepartures()).toHaveLength(1);
    });

    it('keeps the departure id when the departure is edited', async () => {
      load([saved()]);
      component.getCurrentDepartureControl(0, 0)?.get('schedule')?.setValue('19:00');

      await component.submitForm();

      expect(lastSavedWeek().departure[0]).toMatchObject({
        departureId: 'dep-a',
        schedule: '19:00',
      });
    });

    it('hands the statuses loaded with the week to the save, to protect remote reviews', async () => {
      load([saved({ departureId: 'dep-a', cardStatus: 'pending' })]);

      await component.submitForm();

      const call = (service['saveWeeklyDepartureKeepingCardStatus'] as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(call[1]).toEqual({ 'dep-a': 'pending' });
    });

    it('gives new departures an id and never reuses one', async () => {
      load([saved()]);
      component.addControl(0);
      component.copyDay(0, 0);

      await component.submitForm();

      const ids = lastSavedWeek().departure.map((d) => d.departureId);
      expect(ids).toHaveLength(3);
      expect(ids.every(Boolean)).toBe(true);
      expect(new Set(ids).size).toBe(3);
      expect(ids).toContain('dep-a');
    });

    it('marks removal, copy and addition as unsaved changes', () => {
      load([saved()]);
      expect(component.isFormDirty()).toBe(false);
      component.deleteInputForm(0, 0);
      expect(component.isFormDirty()).toBe(true);

      load([saved({ departureId: 'dep-b' })]);
      expect(component.isFormDirty()).toBe(false);
      component.addControl(0);
      expect(component.isFormDirty()).toBe(true);

      load([saved({ departureId: 'dep-c' })]);
      expect(component.isFormDirty()).toBe(false);
      component.copyDay(0, 0);
      expect(component.isFormDirty()).toBe(true);
    });

    it('puts a copied departure right below the original, as a new pending departure', () => {
      load([
        saved({ departureId: 'dep-a', schedule: '09:30', date: '2026-11-10' }),
        saved({ departureId: 'dep-b', schedule: '18:30', date: '2026-11-10' }),
      ]);

      component.copyDay(0, 0);

      const departures = component.getCurrentDepartures();
      expect(departures.map((d) => d.departureId)).toEqual(['dep-a', '', 'dep-b']);
      expect(departures[1]).toMatchObject({ schedule: '09:30', cardStatus: 'pending' });
      expect(departures[1].territory).toEqual(['N°1']);
    });

    it('brings a removed departure back when the user undoes it', () => {
      load([saved({ departureId: 'dep-a' }), saved({ departureId: 'dep-b' })]);

      component.deleteInputForm(0, 0);
      expect(component.getCurrentDepartures().map((d) => d.departureId)).toEqual(['dep-b']);

      snackAction.next();
      expect(component.getCurrentDepartures().map((d) => d.departureId)).toEqual([
        'dep-a',
        'dep-b',
      ]);
    });

    it('rejects when the write fails and leaves the edits alone', async () => {
      load([saved()]);
      // Same order as the card's inputs: mark the field as edited, then change it.
      component.getCurrentDepartureControl(0, 0)?.get('driver')?.markAsDirty();
      component.getCurrentDepartureControl(0, 0)?.get('driver')?.setValue('Beto');
      (
        service['saveWeeklyDepartureKeepingCardStatus'] as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error('offline'));

      await expect(component.submitForm()).rejects.toThrow('offline');

      expect(component.isFormDirty()).toBe(true);
      expect(component.getCurrentDepartures()[0].driver).toBe('Beto');
      expect(component.isSaving()).toBe(false);
    });

    it('does not discard the edits when the publisher groups load later', () => {
      load([saved()]);
      component.getCurrentDepartureControl(0, 0)?.get('driver')?.setValue('Beto');

      component.publisherGroups.set([{ id: 'Grupo 1', publishers: [] }]);
      fixture.detectChanges();

      expect(component.getCurrentDepartures()[0].driver).toBe('Beto');
      expect(component.groupKeys).toEqual([0, 1]);
    });

    it('does not discard the edits when territory data arrives late', () => {
      load([saved()]);
      component.getCurrentDepartureControl(0, 0)?.get('driver')?.setValue('Beto');

      component.processTerritoryData({ [locality.key]: [] });

      expect(component.getCurrentDepartures()[0].driver).toBe('Beto');
    });

    it('moves a departure dated in another week to that week', async () => {
      load([saved({ departureId: 'dep-a' })]);
      component.getCurrentDepartureControl(0, 0)?.get('date')?.setValue('2026-11-17');
      service['getWeeklyDeparture'] = vi.fn(() => of(undefined));
      service['postWeeklyDeparture'] = vi.fn(() => Promise.resolve());

      const result = await component.submitForm();

      expect(result.movedToOtherWeeks).toBe(1);
      expect(lastSavedWeek().departure).toHaveLength(0);
      const other = (service['postWeeklyDeparture'] as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(other.weekId).toBe('2026-11-16');
      expect(other.departure).toHaveLength(1);
    });
  });
});
