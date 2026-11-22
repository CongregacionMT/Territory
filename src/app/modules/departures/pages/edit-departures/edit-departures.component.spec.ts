import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogService } from '@core/services/dialog.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { addDaysToIsoDate, getWeekId } from '@shared/utils/date-utils';
import { FormEditDeparturesComponent } from '../../components/form-edit-departures/form-edit-departures.component';
import { EditDeparturesComponent } from './edit-departures.component';

const CURRENT_WEEK = getWeekId(new Date());
const PREVIOUS_WEEK = addDaysToIsoDate(CURRENT_WEEK, -7);
const NEXT_WEEK = addDaysToIsoDate(CURRENT_WEEK, 7);

const departure = (overrides: Partial<Departure> = {}): Departure => ({
  driver: 'Ana',
  location: 'TerritorioW',
  territory: ['N°1'],
  date: addDaysToIsoDate(PREVIOUS_WEEK, 1),
  maps: '',
  point: 'Plaza',
  schedule: '18:30',
  color: 'info',
  group: 0,
  cardStatus: 'received',
  departureId: 'dep-1',
  ...overrides,
});

describe('EditDeparturesComponent', () => {
  let fixture: ComponentFixture<EditDeparturesComponent>;
  let component: EditDeparturesComponent;
  let weeks: Record<string, WeeklyDeparture | undefined>;
  let confirmAnswer: boolean;
  let confirmDialog: ReturnType<typeof vi.fn>;
  let territoryData: Record<string, ReturnType<typeof vi.fn>>;
  let weekReader: (weekId: string) => Observable<WeeklyDeparture | undefined>;
  let snackBar: { open: ReturnType<typeof vi.fn> };

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const childForm = (): FormEditDeparturesComponent =>
    fixture.debugElement.query(By.directive(FormEditDeparturesComponent)).componentInstance;

  const create = async (): Promise<void> => {
    fixture = TestBed.createComponent(EditDeparturesComponent);
    component = fixture.componentInstance;
    await settle();
  };

  beforeEach(() => {
    weeks = {
      [PREVIOUS_WEEK]: {
        weekId: PREVIOUS_WEEK,
        departure: [
          departure({ departureId: 'p-1' }),
          departure({
            departureId: 'p-2',
            date: addDaysToIsoDate(PREVIOUS_WEEK, 5),
            schedule: '09:30',
          }),
          departure({ departureId: 'p-3', isEvent: true, title: 'Conmemoración' }),
        ],
      },
    };
    confirmAnswer = true;
    confirmDialog = vi.fn(() => of(confirmAnswer));
    weekReader = (weekId) => of(weeks[weekId]);
    snackBar = { open: vi.fn(() => ({ onAction: () => EMPTY })) };

    territoryData = {
      getWeeklyDepartures: vi.fn(() => of(Object.values(weeks))),
      getWeeklyDeparture: vi.fn((weekId: string) => weekReader(weekId)),
      getNumberTerritory: vi.fn(() => of([])),
      getUsers: vi.fn(() => of([])),
      getCardAssigned: vi.fn(() => of([])),
      getGroupList: vi.fn(() => of([])),
      getTerritoryGroups: vi.fn(() => of({})),
      getRecentCardsFromServer: vi.fn(() => Promise.resolve([])),
      postWeeklyDeparture: vi.fn(() => Promise.resolve()),
      createDepartureId: vi.fn((_week: string, _d: Departure, index: number) => `new-${index}`),
      normalizeDepartureForCardTracking: vi.fn((d: Departure) => d),
      saveWeeklyDepartureKeepingCardStatus: vi.fn((week: WeeklyDeparture) =>
        Promise.resolve(week.departure),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TerritoryDataService, useValue: territoryData },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    TestBed.overrideComponent(EditDeparturesComponent, {
      set: { providers: [{ provide: DialogService, useValue: { confirmDialog } }] },
    });
  });

  it('opens the current week without writing anything', async () => {
    await create();

    expect(component.weekId()).toBe(CURRENT_WEEK);
    expect(component.isCurrentWeek()).toBe(true);
    expect(territoryData['saveWeeklyDepartureKeepingCardStatus']).not.toHaveBeenCalled();
    expect(territoryData['postWeeklyDeparture']).not.toHaveBeenCalled();
  });

  describe('starting a new week', () => {
    it('offers to copy the most recent week that has departures', async () => {
      await create();

      expect(component.isEmptyWeekPrompt()).toBe(true);
      expect(component.copySourceWeekId()).toBe(PREVIOUS_WEEK);
      expect(fixture.nativeElement.textContent).toContain('Esta semana todavía no tiene salidas');
    });

    it('copies days, times and places, but leaves drivers and territories empty', async () => {
      await create();
      component.copyFromPreviousWeek();
      await settle();

      const copied = childForm().getCurrentDepartures();
      expect(copied).toHaveLength(2);
      expect(copied.map((d) => d.schedule)).toEqual(['18:30', '09:30']);
      expect(copied.every((d) => d.driver === '' && d.territory.length === 0)).toBe(true);
      expect(copied.every((d) => !d.departureId && d.cardStatus === 'pending')).toBe(true);
      expect(copied[0].date).toBe(addDaysToIsoDate(CURRENT_WEEK, 1));
    });

    it('treats the copy as unsaved work and publishes nothing until saved', async () => {
      await create();
      component.copyFromPreviousWeek();
      await settle();

      expect(component.hasUnsavedChanges()).toBe(true);
      expect(component.canSave()).toBe(true);
      expect(territoryData['saveWeeklyDepartureKeepingCardStatus']).not.toHaveBeenCalled();
    });

    it('lets the user start from scratch', async () => {
      await create();
      component.startBlank();
      await settle();

      expect(component.isEmptyWeekPrompt()).toBe(false);
      expect(component.showForm()).toBe(true);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('explains when there is nothing to copy', async () => {
      weeks = {};
      await create();

      expect(component.copySourceWeekId()).toBe('');
      expect(fixture.nativeElement.textContent).toContain('No hay semanas anteriores con salidas');
    });
  });

  describe('changing week', () => {
    it('does not save anything when moving between weeks', async () => {
      weeks[CURRENT_WEEK] = {
        weekId: CURRENT_WEEK,
        departure: [departure({ departureId: 'c-1' })],
      };
      await create();

      await component.navigateToWeek(PREVIOUS_WEEK);
      await settle();
      await component.navigateToWeek(NEXT_WEEK);
      await settle();

      expect(territoryData['saveWeeklyDepartureKeepingCardStatus']).not.toHaveBeenCalled();
      expect(territoryData['postWeeklyDeparture']).not.toHaveBeenCalled();
    });

    it('asks before discarding edits and stays put when the user declines', async () => {
      await create();
      component.copyFromPreviousWeek();
      await settle();
      confirmAnswer = false;
      const readsBefore = territoryData['getWeeklyDeparture'].mock.calls.length;

      await component.navigateToWeek(NEXT_WEEK);
      await settle();

      expect(confirmDialog).toHaveBeenCalledTimes(1);
      expect(component.weekId()).toBe(CURRENT_WEEK);
      expect(territoryData['getWeeklyDeparture'].mock.calls).toHaveLength(readsBefore);
      expect(childForm().getCurrentDepartures()).toHaveLength(2);
    });

    it('moves on once the user agrees to discard', async () => {
      await create();
      component.copyFromPreviousWeek();
      await settle();

      await component.navigateToWeek(NEXT_WEEK);
      await settle();

      expect(component.weekId()).toBe(NEXT_WEEK);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('does not ask anything when there is nothing unsaved', async () => {
      await create();
      await component.navigateToWeek(PREVIOUS_WEEK);

      expect(confirmDialog).not.toHaveBeenCalled();
      expect(component.weekId()).toBe(PREVIOUS_WEEK);
    });

    it('guards leaving the screen with the same confirmation', async () => {
      await create();
      expect(await component.canDeactivate()).toBe(true);

      component.copyFromPreviousWeek();
      await settle();
      confirmAnswer = false;
      expect(await component.canDeactivate()).toBe(false);
    });

    it('ignores a slow answer for a week the user already left', async () => {
      const pending: Record<string, (value: WeeklyDeparture | undefined) => void> = {};
      weekReader = (weekId) =>
        new Observable((subscriber) => {
          pending[weekId] = (value): void => {
            subscriber.next(value);
            subscriber.complete();
          };
        });
      await create();

      await component.navigateToWeek(PREVIOUS_WEEK);
      pending[PREVIOUS_WEEK](weeks[PREVIOUS_WEEK]);
      pending[CURRENT_WEEK](undefined);
      await settle();

      expect(component.weekId()).toBe(PREVIOUS_WEEK);
      expect(component.isEmptyWeekPrompt()).toBe(false);
      expect(component.formDepartureData()).toHaveLength(3);
    });
  });

  describe('when the week cannot be read', () => {
    it('shows an error with retry instead of an empty week to copy over', async () => {
      weekReader = () => throwError(() => new Error('permission-denied'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await create();

      expect(component.loadState()).toBe('error');
      expect(component.isEmptyWeekPrompt()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la semana');

      weekReader = (weekId) => of(weeks[weekId]);
      component.retryLoad();
      await settle();
      expect(component.loadState()).toBe('ready');
    });
  });

  describe('saving', () => {
    it('saves the week once and reports it', async () => {
      await create();
      component.copyFromPreviousWeek();
      await settle();

      await component.saveWeek();
      await settle();

      const save = territoryData['saveWeeklyDepartureKeepingCardStatus'];
      expect(save).toHaveBeenCalledTimes(1);
      expect((save.mock.calls[0][0] as WeeklyDeparture).weekId).toBe(CURRENT_WEEK);
      expect(component.hasUnsavedChanges()).toBe(false);
      expect(component.justSaved()).toBe(true);
      expect(snackBar.open).toHaveBeenCalledWith(
        expect.stringContaining('Semana guardada'),
        'Ok',
        expect.anything(),
      );
    });

    it('keeps the edits and says so when Firestore rejects the write', async () => {
      territoryData['saveWeeklyDepartureKeepingCardStatus'].mockRejectedValue(new Error('offline'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await create();
      component.copyFromPreviousWeek();
      await settle();

      await component.saveWeek();
      await settle();

      expect(component.hasUnsavedChanges()).toBe(true);
      expect(component.justSaved()).toBe(false);
      expect(snackBar.open).toHaveBeenLastCalledWith(
        expect.stringContaining('No se pudo guardar'),
        'Ok',
        expect.anything(),
      );
      expect(snackBar.open).not.toHaveBeenCalledWith(
        expect.stringContaining('Semana guardada'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('does nothing when there are no changes', async () => {
      await create();
      component.startBlank();
      await settle();

      await component.saveWeek();

      expect(territoryData['saveWeeklyDepartureKeepingCardStatus']).not.toHaveBeenCalled();
    });
  });

  it('suggests preparing next week only while it is still empty', async () => {
    await create();
    expect(component.shouldOfferNextWeek()).toBe(true);

    weeks[NEXT_WEEK] = { weekId: NEXT_WEEK, departure: [departure({ departureId: 'n-1' })] };
    territoryData['getWeeklyDepartures'].mockReturnValue(of(Object.values(weeks)));
    await create();
    expect(component.shouldOfferNextWeek()).toBe(false);
  });

  it('lists recent weeks with how complete each one is', async () => {
    weeks[NEXT_WEEK] = { weekId: NEXT_WEEK, departure: [departure({ driver: '' })] };
    await create();

    const options = component.weekOptions();
    expect(options.find((o) => o.weekId === PREVIOUS_WEEK)?.stateLabel).toBe('Completa');
    expect(options.find((o) => o.weekId === NEXT_WEEK)?.stateLabel).toBe('Incompleta');
    expect(options.find((o) => o.weekId === CURRENT_WEEK)?.stateLabel).toBe('Vacía');
    expect(options.find((o) => o.weekId === CURRENT_WEEK)?.relativeLabel).toBe('Esta semana');
    expect(options.find((o) => o.weekId === NEXT_WEEK)?.relativeLabel).toBe('Próxima semana');
    expect(options.map((o) => o.weekId)).toEqual(
      [...options.map((o) => o.weekId)].sort((a, b) => b.localeCompare(a)),
    );
  });
});
