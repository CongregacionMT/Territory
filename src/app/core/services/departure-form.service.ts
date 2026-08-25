import { Injectable, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Departure } from '@core/models/Departures';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DepartureFormService {
  private fb = inject(FormBuilder);
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

    filteredDepartures.forEach((departure: Departure) => {
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
      const normalizedLocation = locality
        ? locality.territoryPrefix
        : departure.location || 'Seleccionar localidad';

      groupArray.push(
        this.fb.group({
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

    departureFormArrayItem.push(
      this.fb.group({
        date: new FormControl(dateStr),
        driver: new FormControl(''),
        schedule: new FormControl(''),
        location: new FormControl('Seleccionar localidad'),
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
