import { Injectable, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { environment } from '@environments/environment';
import { daysBetweenIsoDates, addDaysToIsoDate } from '@shared/utils/date-utils';
import { DEFAULT_DEPARTURE_COLOR } from '@shared/utils/departure-colors';
import { sortDeparturesByDateTime } from '@shared/utils/departure-sort.utils';

export type AssignmentStatus =
  'complete' | 'missing-driver' | 'missing-territory' | 'missing-both' | 'event';

export type WeekFillState = 'empty' | 'incomplete' | 'complete';

@Injectable({
  providedIn: 'root',
})
export class DepartureFormService {
  private readonly fb = inject(FormBuilder);
  public localities = environment.localities;

  createForm(): FormGroup {
    return this.fb.group({
      departure0: new FormArray([]),
    });
  }

  initForm(
    formDeparture: FormGroup,
    departures: Departure[],
    targetMondayStr: string,
  ): { groupKeys: number[]; groupedDepartures: { [key: string]: Departure[] } } {
    let groupKeys: number[] = [];
    const groupedDepartures: { [key: string]: Departure[] } = {};

    Object.keys(formDeparture.controls).forEach((key) => {
      if (key.startsWith('departure')) {
        (formDeparture.get(key) as FormArray).clear();
      }
    });

    if (!departures || departures.length === 0) {
      return { groupKeys: [0], groupedDepartures: {} };
    }

    const targetMonday = new Date(targetMondayStr + 'T00:00:00');
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    const filteredDepartures = departures.filter((departure: Departure) => {
      if (!departure.date) return true;
      const d = new Date(departure.date + 'T00:00:00');
      if (isNaN(d.getTime())) return true;
      return d >= targetMonday && d <= targetSunday;
    });

    if (filteredDepartures.length === 0) {
      return { groupKeys: [0], groupedDepartures: {} };
    }

    sortDeparturesByDateTime(filteredDepartures).forEach((departure: Departure) => {
      const rawGroup = Number(departure.group);
      const groupKey = isNaN(rawGroup) ? 0 : rawGroup;

      if (!groupedDepartures[groupKey]) {
        groupKeys.push(groupKey);
        groupedDepartures[groupKey] = [];
      }
      groupedDepartures[groupKey].push(departure);

      const groupArrayKey = `departure${groupKey}`;
      let groupArray = formDeparture.get(groupArrayKey) as FormArray;
      if (!groupArray) {
        groupArray = this.fb.array([]);
        formDeparture.setControl(groupArrayKey, groupArray);
      }

      const locality = this.localities.find((l) => l.key === departure.location);
      let normalizedLocation = locality ? locality.territoryPrefix : departure.location;

      if (!normalizedLocation || normalizedLocation === 'Seleccionar localidad') {
        normalizedLocation =
          this.localities && this.localities.length > 0 ? this.localities[0].territoryPrefix : '';
      }

      groupArray.push(
        this.fb.group({
          departureId: new FormControl(departure.departureId || ''),
          date: new FormControl(departure.date || targetMondayStr),
          driver: new FormControl(departure.driver || ''),
          schedule: new FormControl(departure.schedule || ''),
          location: new FormControl(normalizedLocation),
          territory: this.fb.array(
            (departure.territory || []).map((t: string) => new FormControl(t)),
          ),
          point: new FormControl(departure.point || ''),
          maps: new FormControl(departure.maps || ''),
          color: new FormControl(departure.color || 'secondary'),
          group: new FormControl(groupKey),
          isEvent: new FormControl(departure.isEvent || false),
          title: new FormControl(departure.title || ''),
          cardStatus: new FormControl(
            departure.isEvent ? 'not_required' : departure.cardStatus || 'pending',
          ),
        }),
      );
    });

    groupKeys = [...new Set([0, ...groupKeys])].sort((a, b) => a - b);
    return { groupKeys, groupedDepartures };
  }

  addControl(formDeparture: FormGroup, group: number, dateStr: string): void {
    const departureGroupKey = `departure${group}`;
    let departureFormArrayItem = formDeparture.get(departureGroupKey) as FormArray;

    if (!departureFormArrayItem) {
      departureFormArrayItem = this.fb.array([]);
      formDeparture.setControl(departureGroupKey, departureFormArrayItem);
    }

    const defaultColor = group === 0 ? 'secondary' : 'primary';
    const defaultLocation =
      this.localities && this.localities.length > 0 ? this.localities[0].territoryPrefix : '';

    departureFormArrayItem.push(
      this.fb.group({
        departureId: new FormControl(''),
        date: new FormControl(dateStr),
        driver: new FormControl(''),
        schedule: new FormControl(''),
        location: new FormControl(defaultLocation),
        territory: this.fb.array([]),
        point: new FormControl(''),
        maps: new FormControl(''),
        color: new FormControl(defaultColor),
        group: new FormControl(group),
        isEvent: new FormControl(false),
        title: new FormControl(''),
        cardStatus: new FormControl('pending'),
      }),
    );
  }

  removeControl(formDeparture: FormGroup, index: number, group: number): void {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = formDeparture.get(departureGroupKey) as FormArray;
    if (departureFormArrayItem) {
      departureFormArrayItem.removeAt(index);
    }
  }

  /** What is still missing for a departure to be ready: driver and/or territory. */
  getAssignmentStatus(departure: Departure): AssignmentStatus {
    if (departure.isEvent) return 'event';

    const missingDriver = !departure.driver?.trim();
    const missingTerritory = (departure.territory ?? []).length === 0;

    if (missingDriver && missingTerritory) return 'missing-both';
    if (missingDriver) return 'missing-driver';
    if (missingTerritory) return 'missing-territory';
    return 'complete';
  }

  getWeekFillState(departures: readonly Departure[]): WeekFillState {
    if (departures.length === 0) return 'empty';
    const allReady = departures.every((departure) => {
      const status = this.getAssignmentStatus(departure);
      return status === 'complete' || status === 'event';
    });
    return allReady ? 'complete' : 'incomplete';
  }

  /** Weeks worth copying: they have at least one regular (non-event) departure. */
  hasCopyableDepartures(week: WeeklyDeparture | undefined): boolean {
    return (week?.departure ?? []).some((departure) => !departure.isEvent);
  }

  /** The most recent week before `targetWeekId` that has departures to copy. */
  findSourceWeek(
    history: readonly WeeklyDeparture[],
    targetWeekId: string,
  ): WeeklyDeparture | undefined {
    return [...history]
      .filter((week) => !!week.weekId && week.weekId < targetWeekId)
      .sort((a, b) => b.weekId.localeCompare(a.weekId))
      .find((week) => this.hasCopyableDepartures(week));
  }

  /**
   * Builds the departures of a new week from another one: same days, times, places,
   * colors and groups. Drivers, territories, events and card progress are not carried over.
   */
  createWeekFromSource(source: WeeklyDeparture, targetWeekId: string): Departure[] {
    const shiftDays = daysBetweenIsoDates(source.weekId, targetWeekId) ?? 0;
    const defaultLocation = this.localities[0]?.territoryPrefix ?? environment.territoryPrefix;

    const copies = (source.departure ?? [])
      .filter((departure) => !departure.isEvent)
      .map((departure): Departure => ({
        driver: '',
        location: departure.location || defaultLocation,
        territory: [],
        date: departure.date ? addDaysToIsoDate(departure.date, shiftDays) : targetWeekId,
        maps: departure.maps || '',
        point: departure.point || '',
        schedule: departure.schedule || '',
        color: departure.color || DEFAULT_DEPARTURE_COLOR,
        group: Number(departure.group) || 0,
        isEvent: false,
        title: '',
        cardStatus: 'pending',
      }));

    return sortDeparturesByDateTime(copies);
  }

  addTerritoryControl(
    formDeparture: FormGroup,
    index: number,
    group: number,
    territoryValue: string,
  ): void {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = formDeparture.get(departureGroupKey) as FormArray;
    if (departureFormArrayItem) {
      const departureFormGroup = departureFormArrayItem.at(index) as FormGroup;
      const territoryFormArray = departureFormGroup.get('territory') as FormArray;
      if (territoryFormArray) {
        territoryFormArray.push(new FormControl(territoryValue));
      }
    }
  }

  removeTerritoryControl(
    formDeparture: FormGroup,
    departureIndex: number,
    group: number,
    territoryIndex: number,
  ): void {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = formDeparture.get(departureGroupKey) as FormArray;
    if (departureFormArrayItem) {
      const departureFormGroup = departureFormArrayItem.at(departureIndex) as FormGroup;
      const territoryFormArray = departureFormGroup.get('territory') as FormArray;
      if (territoryFormArray) {
        territoryFormArray.removeAt(territoryIndex);
      }
    }
  }
}
