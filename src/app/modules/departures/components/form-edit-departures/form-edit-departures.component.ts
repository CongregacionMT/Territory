import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  OnInit,
  inject,
  input,
  signal,
  effect,
  model,
  output,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgClass } from '@angular/common';
import { DepartureDayCardComponent } from '../departure-day-card/departure-day-card.component';
import { TerritorySelectionModalComponent } from '../territory-selection-modal/territory-selection-modal.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { DepartureFormService } from '@core/services/departure-form.service';
import { Departure } from '../../../../core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TERRITORY_COUNT } from '@shared/utils/territories.config';
import { environment } from '@environments/environment';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { User } from '@core/models/User';
import { WeeklyDeparture } from '../../../../core/models/Departures';
import { take } from 'rxjs';
import { Card } from '@core/models/Card';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-form-edit-departures',
  templateUrl: './form-edit-departures.component.html',
  styleUrls: ['./form-edit-departures.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgClass,
    DepartureDayCardComponent,
    TerritorySelectionModalComponent,
  ],
})
export class FormEditDeparturesComponent implements OnInit {
  getFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  private destroyRef = inject(DestroyRef);
  private territoryDataService = inject(TerritoryDataService);
  private departureFormService = inject(DepartureFormService);
  private fb = inject(FormBuilder);
  // private fb = inject();
  private spinner = inject(SpinnerService);
  private _snackBar = inject(MatSnackBar);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  formDeparture: FormGroup;
  groupKeys: number[] = [];
  groupedDepartures: { [key: string]: Departure[] } = {};
  readonly formDepartureDataInput = input<Departure[]>([] as Departure[]);
  readonly dateDepartureInput = input<string>('');
  readonly saveTrigger = input<number>(0);
  readonly isFormDirty = model<boolean>(false);
  readonly saveCompleted = output<Departure[]>();
  readonly formValueChanged = output<void>();

  drivers = signal<User[]>([]);
  congregationName = environment.congregationName;
  territoryPrefix = environment.territoryPrefix;
  congregationKey = environment.congregationKey;
  localities = environment.localities;
  territoryOptionsMap = signal<{ [key: string]: string[] }>({});
  isAdmin: boolean = false;
  activeModal = signal<{ dayIndex: number; groupKey: number } | null>(null);

  get activeModalDays(): AbstractControl | null {
    const modal = this.activeModal();
    if (!modal) return null;
    const controls = this.filterControlsByGroup(modal.groupKey);
    return controls[modal.dayIndex] || null;
  }
  personalAssignments = signal<Card[]>([]);
  showPersonalTerritories: boolean = false;
  sortByAge: boolean = true;
  weeklyHistory = signal<WeeklyDeparture[]>([]);
  territoryLastCompletedDays = signal<{ [locationPrefix: string]: { [num: number]: number } }>({});
  // territoryGroupsMap: { [locationPrefix: string]: { [territoryNum: number]: number } }
  // Maps location prefix -> territory number -> group number (1, 2, 3...)
  territoryGroupsMap = signal<{ [locationPrefix: string]: { [territoryNum: number]: number } }>({});
  selectedTerritoryGroup: number | null = null; // null = todos
  availableGroupNumbers: number[] = []; // grupos disponibles para la localidad actual
  private readonly CARD_TRACKING_START_DATE = '2026-05-11';
  constructor() {
    effect(() => {
      if (this.saveTrigger() > 0) {
        this.submitForm();
      }
    });

    this.isAdmin = this.authService.isAdmin();
    this.formDeparture = this.departureFormService.createForm();

    // Efecto para reaccionar a cambios en los inputs y recargar el formulario
    effect(() => {
      const departures = this.formDepartureDataInput();
      this.initForm(departures);
    });
  }
  ngOnInit(): void {
    this.loadTerritoryData();
    this.loadDrivers();
    this.loadPersonalAssignments();
    this.loadWeeklyHistory();
    this.loadTerritoryGroups();

    this.formDeparture.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.formDeparture.dirty && !this.isFormDirty()) {
        this.isFormDirty.set(true);
      }
      this.formValueChanged.emit();
    });
  }

  initForm(departures: Departure[]): void {
    if (this.isFormDirty) this.isFormDirty.set(false);

    const targetMondayStr = this.dateDepartureInput();
    const result = this.departureFormService.initForm(
      this.formDeparture,
      departures,
      targetMondayStr,
    );
    this.groupKeys = result.groupKeys;
    this.groupedDepartures = result.groupedDepartures;

    this.formDeparture.markAsPristine();

    this.cdr.markForCheck();
  }
  loadTerritoryData(): void {
    const stored = sessionStorage.getItem('numberTerritory');
    if (stored) {
      this.processTerritoryData(JSON.parse(stored) as Record<string, unknown>);
    } else {
      this.territoryDataService
        .getNumberTerritory()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((numbers: TerritoryNumberData[]) => {
          const mergedData = numbers.reduce(
            (acc: Record<string, unknown>, curr: TerritoryNumberData) => {
              return { ...acc, ...curr };
            },
            {},
          );
          sessionStorage.setItem('numberTerritory', JSON.stringify(mergedData));
          this.processTerritoryData(mergedData);
        });
    }
  }
  processTerritoryData(data: Record<string, unknown>): void {
    this.localities.forEach((loc) => {
      if (loc.hasNumberedTerritories) {
        const rawData = (data[loc.key] as unknown[]) || [];
        const numbers = rawData
          .map((item: unknown) => {
            if (typeof item === 'object' && item !== null && 'territorio' in item) {
              return (item as { territorio: number }).territorio;
            }
            return item;
          })
          .filter((n: unknown) => typeof n === 'number' || !isNaN(Number(n)));

        const sorted = numbers.sort((a: unknown, b: unknown) => Number(a) - Number(b));
        const options = sorted.map((n: unknown) => `N°${String(n)}`);

        this.territoryOptionsMap.update((m) => ({ ...m, [loc.territoryPrefix]: options }));
        if (loc.key) {
          this.territoryOptionsMap.update((m) => ({ ...m, [loc.key]: options }));
        }
      } else {
        const options = ['Rural'];
        this.territoryOptionsMap.update((m) => ({ ...m, [loc.territoryPrefix]: options }));
        if (loc.key) {
          this.territoryOptionsMap.update((m) => ({ ...m, [loc.key]: options }));
        }
      }
    });

    if (
      !this.territoryOptionsMap()[this.territoryPrefix] &&
      (!data || Object.keys(data).length === 0)
    ) {
      this.territoryOptionsMap.update((m) => ({
        ...m,
        [this.territoryPrefix]: Array.from({ length: TERRITORY_COUNT }, (_, i) => `N°${i + 1}`),
      }));
    }

    const departures = this.formDepartureDataInput();
    if (departures.length > 0) {
      this.initForm(departures);
    }
    void this.loadAllTerritoryCompletionData(data);
  }

  async loadAllTerritoryCompletionData(data: Record<string, unknown>): Promise<void> {
    const promises = [];
    for (const loc of this.localities) {
      if (loc.hasNumberedTerritories) {
        const rawData = (data[loc.key] as unknown[]) || [];
        const territories = rawData.filter(
          (t: unknown) => t && typeof t === 'object' && 'collection' in t && 'territorio' in t,
        );
        if (territories.length > 0) {
          promises.push(this.loadTerritoryCompletionData(loc, territories));
        }
      }
    }
    await Promise.all(promises);
  }

  async loadTerritoryCompletionData(
    loc: { territoryPrefix: string; key: string; hasNumberedTerritories: boolean },
    territories: unknown[],
  ): Promise<void> {
    const locationPrefix = loc.territoryPrefix;
    this.territoryLastCompletedDays.update((m) => ({
      ...m,
      [locationPrefix]: m[locationPrefix] || {},
    }));

    const path = loc.key;
    const suffix = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, '');

    const storageKeys = [
      `statisticData${suffix}_6`,
      `statisticData${suffix}_12`,
      `statisticData${suffix}_24`,
    ];
    for (const key of storageKeys) {
      const cachedData = sessionStorage.getItem(key);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData) as Card[][];
          parsedData.forEach((territoryCards: Card[]) => {
            if (territoryCards && territoryCards.length > 0) {
              const primaryCard = territoryCards[0];
              const num = primaryCard.numberTerritory || primaryCard.territory;
              if (num !== undefined) {
                let lastEnd = null;
                for (let i = 0; i < 6 && i < territoryCards.length; i++) {
                  if (territoryCards[i].end) {
                    lastEnd = territoryCards[i].end;
                    break;
                  }
                }
                if (lastEnd) {
                  const today = new Date();
                  const dateToday = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate(),
                  );
                  let dateCard: Date;
                  if (typeof lastEnd === 'string' || typeof lastEnd === 'number') {
                    dateCard = new Date(lastEnd);
                  } else if (
                    lastEnd &&
                    typeof (lastEnd as { toDate?: () => Date }).toDate === 'function'
                  ) {
                    dateCard = (lastEnd as unknown as { toDate: () => Date }).toDate();
                  } else if (
                    lastEnd &&
                    typeof (lastEnd as { seconds?: number }).seconds === 'number'
                  ) {
                    dateCard = new Date((lastEnd as unknown as { seconds: number }).seconds * 1000);
                  } else {
                    dateCard = new Date(lastEnd);
                  }

                  if (!isNaN(dateCard.getTime())) {
                    const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
                    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                    this.territoryLastCompletedDays.update((m) => {
                      m[locationPrefix][Number(num)] = days;
                      return { ...m };
                    });
                  } else {
                    this.territoryLastCompletedDays.update((m) => {
                      m[locationPrefix][Number(num)] = Infinity;
                      return { ...m };
                    });
                  }
                } else {
                  this.territoryLastCompletedDays.update((m) => {
                    m[locationPrefix][Number(num)] = Infinity;
                    return { ...m };
                  });
                }
              }
            }
          });
          return;
        } catch (e: unknown) {
          console.error('Error parsing session storage', e);
        }
      }
    }

    const promises = (territories as { collection: string; territorio: number }[]).map(
      (t) =>
        new Promise<void>((resolve) => {
          this.territoryDataService
            .getCardTerritorie(t.collection, 120)
            .pipe(take(1))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((cards) => {
              let lastEnd = null;
              for (const c of cards) {
                if (c.end) {
                  lastEnd = c.end;
                  break;
                }
              }
              if (lastEnd) {
                const today = new Date();
                const dateToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                let dateCard: Date;
                if (typeof lastEnd === 'string' || typeof lastEnd === 'number') {
                  dateCard = new Date(lastEnd);
                } else if (
                  lastEnd &&
                  typeof (lastEnd as { toDate?: () => Date }).toDate === 'function'
                ) {
                  dateCard = (lastEnd as unknown as { toDate: () => Date }).toDate();
                } else if (
                  lastEnd &&
                  typeof (lastEnd as { seconds?: number }).seconds === 'number'
                ) {
                  dateCard = new Date((lastEnd as unknown as { seconds: number }).seconds * 1000);
                } else {
                  dateCard = new Date(lastEnd);
                }

                if (!isNaN(dateCard.getTime())) {
                  const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
                  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                  this.territoryLastCompletedDays.update((m) => {
                    m[locationPrefix][t.territorio] = days;
                    return { ...m };
                  });
                } else {
                  this.territoryLastCompletedDays.update((m) => {
                    m[locationPrefix][t.territorio] = Infinity;
                    return { ...m };
                  });
                }
              } else {
                this.territoryLastCompletedDays.update((m) => {
                  m[locationPrefix][t.territorio] = Infinity;
                  return { ...m };
                });
              }
              resolve();
            });
        }),
    );
    await Promise.all(promises);
  }

  loadDrivers(): void {
    this.territoryDataService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        this.drivers.set(users.sort((a, b) => a.user.localeCompare(b.user)));
      });
  }

  loadPersonalAssignments(): void {
    this.territoryDataService
      .getCardAssigned()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cards) => this.personalAssignments.set(cards || []));
  }

  loadWeeklyHistory(): void {
    this.territoryDataService
      .getWeeklyDepartures()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((history) => {
        this.weeklyHistory.set(history);
      });
  }

  loadTerritoryGroups(): void {
    this.territoryDataService
      .getTerritoryGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: Record<string, Record<number, number>> | null) => {
        if (!data) return;
        // data shape: { [locationPrefix]: { [territoryNum]: groupNumber } }
        this.territoryGroupsMap.set(data);
      });
  }

  async saveTerritoryGroups(): Promise<void> {
    await this.territoryDataService.saveTerritoryGroups(this.territoryGroupsMap());
  }

  /**
   * Returns the group number assigned to a territory, or 0 if not assigned.
   */

  /**
   * Assigns a territory to a departure group (for the admin config panel).
   */
  setTerritoryGroupAssignment(num: string, locationPrefix: string, groupNum: number | null): void {
    if (!this.territoryGroupsMap()[locationPrefix]) {
      this.territoryGroupsMap()[locationPrefix] = {};
    }
    const n = this.normalizeTerritoryNumber(num);
    if (groupNum === null || groupNum === 0) {
      delete this.territoryGroupsMap()[locationPrefix][n];
    } else {
      this.territoryGroupsMap()[locationPrefix][n] = groupNum;
    }
  }

  openModal(dayIndex: number, groupKey: number): void {
    this.activeModal.set({ dayIndex, groupKey });
    this.selectedTerritoryGroup = groupKey > 0 ? groupKey : null;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.activeModal.set(null);
    this.cdr.detectChanges();
  }

  isModalOpen(dayIndex: number, groupKey: number): boolean {
    return this.activeModal()?.dayIndex === dayIndex && this.activeModal()?.groupKey === groupKey;
  }

  getAvailableGroupNumbers(locationPrefix: string): number[] {
    const locGroups = this.territoryGroupsMap()[locationPrefix];
    if (!locGroups) return [];
    const groups = new Set(Object.values(locGroups).filter((g) => g > 0));
    return Array.from(groups).sort((a, b) => a - b);
  }

  isPersonalTerritory(num: string, locationPrefix: string): boolean {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);

    return this.personalAssignments().some((assignment) => {
      const assignedTerritory = this.normalizeTerritoryNumber(
        String(assignment.territory || assignment.territoryNumber || ''),
      );
      const assignedLocation = String(assignment.location || '').toLowerCase();

      return (
        assignedTerritory === territoryNumber &&
        locationNames.some((name) => assignedLocation.includes(name))
      );
    });
  }

  isTerritoryUsedInWeek(
    num: string,
    locationPrefix: string,
    currentIndex: number,
    currentGroup: number,
  ): boolean {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);

    return this.groupKeys.some((group) => {
      const controls = this.filterControlsByGroup(group);
      return controls.some((control, index) => {
        if (group === currentGroup && index === currentIndex) return false;
        const controlLocation = String(control.get('location')?.value || '');
        const controlLocationNames = this.getLocationNames(controlLocation);
        const sameLocation = locationNames.some((name) => controlLocationNames.includes(name));
        if (!sameLocation) return false;

        return this.getTerritories(control).some(
          (selected) => this.normalizeTerritoryNumber(selected) === territoryNumber,
        );
      });
    });
  }

  getTerritoryLastUsedDays(num: string, locationPrefix: string): number {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);

    let foundDays = Infinity;

    if (
      this.territoryLastCompletedDays()[locationPrefix] &&
      this.territoryLastCompletedDays()[locationPrefix][territoryNumber] !== undefined
    ) {
      foundDays = this.territoryLastCompletedDays()[locationPrefix][territoryNumber];
    } else {
      for (const loc of this.localities) {
        if (
          locationNames.includes(loc.territoryPrefix.toLowerCase()) ||
          locationNames.includes(loc.key.toLowerCase())
        ) {
          if (
            this.territoryLastCompletedDays()[loc.territoryPrefix] &&
            this.territoryLastCompletedDays()[loc.territoryPrefix][territoryNumber] !== undefined
          ) {
            foundDays = this.territoryLastCompletedDays()[loc.territoryPrefix][territoryNumber];
            break;
          }
        }
      }
    }

    return foundDays;
  }

  getTerritoryList(locationPrefix: string): string[] {
    if (!locationPrefix || locationPrefix === 'Seleccionar localidad') return [];

    // If exact match found
    if (this.territoryOptionsMap()[locationPrefix])
      return this.territoryOptionsMap()[locationPrefix];

    // Fallback: search by checking against all prefixes if logic is complex,
    // but here we just return empty or default.
    // If 'Rural' (TerritorioR) was not in localities for some reason, we might miss it.
    if (locationPrefix === 'TerritorioR') return ['Rural'];

    return [];
  }

  getFilteredTerritoryList(locationPrefix: string, index: number, group: number): string[] {
    return this.getTerritoryList(locationPrefix)
      .filter((num) => {
        if (this.isTerritoryChecked(num, index, group)) return true;
        if (this.selectedTerritoryGroup !== null) {
          const assignedGroup = this.getTerritoryGroupNumber(num, locationPrefix);
          if (assignedGroup > 0 && assignedGroup !== this.selectedTerritoryGroup) return false;
        }
        if (!this.showPersonalTerritories && this.isPersonalTerritory(num, locationPrefix))
          return false;
        return true;
      })
      .sort((a, b) => {
        const aUsed = this.isTerritoryUsedInWeek(a, locationPrefix, index, group) ? 1 : 0;
        const bUsed = this.isTerritoryUsedInWeek(b, locationPrefix, index, group) ? 1 : 0;
        if (aUsed !== bUsed) return aUsed - bUsed;

        const aPersonal =
          this.isPersonalTerritory(a, locationPrefix) && !this.isTerritoryChecked(a, index, group)
            ? 1
            : 0;
        const bPersonal =
          this.isPersonalTerritory(b, locationPrefix) && !this.isTerritoryChecked(b, index, group)
            ? 1
            : 0;
        if (aPersonal !== bPersonal) return aPersonal - bPersonal;

        if (this.sortByAge) {
          const aDays = this.getTerritoryLastUsedDays(a, locationPrefix);
          const bDays = this.getTerritoryLastUsedDays(b, locationPrefix);
          if (aDays !== bDays) return bDays - aDays;
        }

        return this.normalizeTerritoryNumber(a) - this.normalizeTerritoryNumber(b);
      });
  }

  isTerritoryChecked(num: string, index: number, group: number): boolean {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control) return false;
    return this.getTerritories(control).includes(num);
  }

  getTerritoryGroupNumber(num: string, locationPrefix: string): number {
    const numericNum = Number(num);
    if (!isNaN(numericNum) && this.territoryGroupsMap()[locationPrefix]?.[numericNum]) {
      return this.territoryGroupsMap()[locationPrefix][numericNum];
    }
    return 0;
  }

  getPersonalPublisher(num: string, locationPrefix: string): string {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);
    const assignment = this.personalAssignments().find((item) => {
      const assignedTerritory = this.normalizeTerritoryNumber(
        String(item.territory || item.territoryNumber || ''),
      );
      const assignedLocation = String(item.location || '').toLowerCase();
      return (
        assignedTerritory === territoryNumber &&
        locationNames.some((name) => assignedLocation.includes(name))
      );
    });

    return assignment?.publisher || assignment?.driver || '';
  }

  getTerritoryBadges(
    num: string,
    locationPrefix: string,
    currentIndex: number,
    currentGroup: number,
  ): string[] {
    const badges: string[] = [];

    if (this.isPersonalTerritory(num, locationPrefix)) {
      const publisher = this.getPersonalPublisher(num, locationPrefix);
      badges.push(publisher ? `Personal: ${publisher}` : 'Personal');
    }

    if (this.isTerritoryUsedInWeek(num, locationPrefix, currentIndex, currentGroup)) {
      badges.push('Ya elegido esta semana');
    }

    return badges;
  }

  isBeforeTrackingStart(dateStr: string): boolean {
    if (!dateStr) return false;
    return dateStr < this.CARD_TRACKING_START_DATE;
  }

  /**
   * Retorna cuántos días hace que se COMPLETÓ un territorio.
   * Infinity = nunca completado (prioridad máxima — aparece primero en rojo).
   */

  /**
   * Retorna una etiqueta human-friendly de la antigüedad del territorio.
   * Ejemplos: "Nunca", "Hace 3 sem", "Hace 2 meses".
   */

  /**
   * Retorna la clase de color de fila según antigüedad del territorio.
   * Misma lógica que paintRow() en la pantalla de estadísticas.
   */

  getCurrentDepartureControl(index: number, group: number): AbstractControl | null {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray;
    return departureFormArrayItem?.at(index) ?? null;
  }

  getSuggestedTerritories(index: number, group: number): string[] {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control) return [];

    const location = this.getControlValue(index, group, 'location') as string;
    return this.getFilteredTerritoryList(location, index, group)
      .filter((territory) => !this.getTerritories(control).includes(territory))
      .slice(0, 3);
  }

  getQuickSuggestionText(index: number, group: number): string {
    const suggestion = this.getSuggestedMeetingDetails(index, group);
    if (!suggestion.point) return '';

    return `Punto: ${suggestion.point}`;
  }

  hasQuickMeetingSuggestions(index: number, group: number): boolean {
    return !!this.getQuickSuggestionText(index, group);
  }

  getControlValue(index: number, group: number, key: string): unknown {
    return this.getCurrentDepartureControl(index, group)?.get(key)?.value;
  }

  getSuggestedMeetingDetails(index: number, group: number): { point: string; maps: string } {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control) return { point: '', maps: '' };

    const location = control.get('location')?.value as string;
    const selectedTerritories = this.getTerritories(control);

    if (!location || location === 'Seleccionar localidad') {
      return { point: '', maps: '' };
    }

    for (const territory of selectedTerritories) {
      const detail = this.getLastMeetingDetailsForTerritory(location, territory);
      if (detail.point || detail.maps) {
        return detail;
      }
    }

    const fallbackTerritory = this.getSuggestedTerritories(index, group)[0];
    if (!fallbackTerritory) {
      return { point: '', maps: '' };
    }

    return this.getLastMeetingDetailsForTerritory(location, fallbackTerritory);
  }

  getLastMeetingDetailsForTerritory(
    locationPrefix: string,
    territory: string,
  ): { point: string; maps: string } {
    const normalizedTerritory = this.normalizeTerritoryNumber(territory);

    const matches = (this.weeklyHistory() || [])
      .flatMap((week) => week.departure || [])
      .filter((departure) => departure.location === locationPrefix)
      .filter((departure) =>
        (departure.territory || []).some(
          (item) => this.normalizeTerritoryNumber(String(item)) === normalizedTerritory,
        ),
      )
      .filter((departure) => !!departure.point || !!departure.maps)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    const bestMatch = matches[0];
    return {
      point: bestMatch?.point || '',
      maps: bestMatch?.maps || '',
    };
  }

  syncMeetingDetails(index: number, group: number): void {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control) return;

    const location = control.get('location')?.value as string;
    if (!location || location === 'Seleccionar localidad') return;

    const selectedTerritories = this.getTerritories(control);
    if (selectedTerritories.length === 0) return;

    for (const territory of selectedTerritories) {
      const detail = this.getLastMeetingDetailsForTerritory(location, territory);
      if (detail.point && !control.get('point')?.value) {
        control.get('point')?.setValue(detail.point);
      }
      if (detail.maps && !control.get('maps')?.value) {
        control.get('maps')?.setValue(detail.maps);
      }
      if (control.get('point')?.value || control.get('maps')?.value) {
        break;
      }
    }
  }

  applySuggestedTerritory(index: number, group: number, territory: string): void {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control) return;

    if (!this.getTerritories(control).includes(territory)) {
      this.toggleTerritory(territory, index, group, true);
    }

    this.syncMeetingDetails(index, group);
    if (this.isFormDirty) this.isFormDirty.set(true);
  }

  markDepartureAsReceived(departureToMark: Departure): boolean {
    for (const group of this.groupKeys) {
      const departureGroupKey = `departure${group}`;
      const groupArray = this.formDeparture.get(departureGroupKey) as FormArray;
      if (!groupArray) continue;

      for (let i = 0; i < groupArray.length; i++) {
        const control = groupArray.at(i);
        if (
          control.get('date')?.value === departureToMark.date &&
          control.get('schedule')?.value === departureToMark.schedule &&
          control.get('group')?.value === Number(departureToMark.group) &&
          control.get('driver')?.value === departureToMark.driver
        ) {
          control.get('cardStatus')?.setValue('received');
          if (this.isFormDirty) this.isFormDirty.set(true);
          return true;
        }
      }
    }
    return false;
  }

  getCurrentDepartures(): Departure[] {
    const formDepartures = this.groupKeys
      .map((num) => (this.formDeparture.value as Record<string, Departure[]>)?.[`departure${num}`])
      .flat()
      .filter(Boolean);
    return formDepartures;
  }

  private normalizeTerritoryNumber(value: string): number {
    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : -1;
  }

  private getLocationNames(locationPrefix: string): string[] {
    const location = String(locationPrefix || '').toLowerCase();
    const locality = this.localities.find(
      (loc) =>
        String(loc.territoryPrefix || '').toLowerCase() === location ||
        String(loc.key || '').toLowerCase() === location ||
        String(loc.name || '').toLowerCase() === location,
    );

    return [
      location,
      String(locality?.key || '').toLowerCase(),
      String(locality?.name || '').toLowerCase(),
      String(locality?.territoryPrefix || '').toLowerCase(),
    ].filter(Boolean);
  }
  openSnackBar(message: string, action: string): void {
    this._snackBar.open(message, action, {
      verticalPosition: 'top',
    });
  }
  filterControlsByGroup(group: number): AbstractControl[] {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray;
    return departureFormArrayItem?.controls || [];
  }
  getGroupTitle(group: number | 'generales'): string {
    // Tratar 0, NaN y valores inválidos como "Salidas Generales"
    const num = Number(group);
    if (num === 0 || isNaN(num)) {
      return 'Salidas Generales';
    }
    return 'Grupo ' + group;
  }

  onChangeColor(event: Event, index: number, group: number): void {
    if (this.isFormDirty()) this.isFormDirty.set(true);
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray;
    const control = departureFormArrayItem.at(index);
    if (control) {
      control.get('color')?.setValue((event.target as HTMLInputElement).value);
    }
  }

  copyDay(index: number, group: number): void {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray;
    const currentControl = departureFormArrayItem.at(index);
    if (!currentControl) return;

    // Add a new empty control, then patch with values from the current one
    const targetMondayStr = this.dateDepartureInput();
    this.departureFormService.addControl(this.formDeparture, group, targetMondayStr);
    const newControl = departureFormArrayItem.at(departureFormArrayItem.length - 1);
    newControl.patchValue(currentControl.value);

    // Copy territory array values manually
    const sourceTerritories =
      ((currentControl.get('territory') as FormArray)?.value as string[]) || [];
    const targetTerritoryArray = newControl.get('territory') as FormArray;
    targetTerritoryArray.clear();
    sourceTerritories.forEach((t: string) => targetTerritoryArray.push(new FormControl(t)));
    if (this.isFormDirty) this.isFormDirty.set(true);
  }

  addControl(group: number): void {
    const targetMondayStr = this.dateDepartureInput();
    this.departureFormService.addControl(this.formDeparture, group, targetMondayStr);
    if (this.isFormDirty) this.isFormDirty.set(true);
  }

  removeControl(index: number, group: number): void {
    this.departureFormService.removeControl(this.formDeparture, index, group);
    if (this.isFormDirty()) this.isFormDirty.set(true);
  }

  addInputForm(group: number): void {
    this.addControl(group);
  }
  deleteInputForm(index: number, group: number): void {
    if (this.isFormDirty()) this.isFormDirty.set(true);
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray;
    if (departureFormArrayItem) {
      departureFormArrayItem.removeAt(index);
      if (departureFormArrayItem.length === 0 && group !== 0) {
        this.groupKeys = this.groupKeys.filter((k) => k !== group);
      }
    }
  }
  rollbackInputForm(): void {
    if (this.isFormDirty()) this.isFormDirty.set(true);
    this.groupKeys = [];
    this.groupedDepartures = {};

    // Limpiar todos los FormArrays existentes
    Object.keys(this.formDeparture.controls).forEach((key) => {
      if (key.startsWith('departure')) {
        (this.formDeparture.get(key) as FormArray).clear();
      }
    });

    const departures = this.formDepartureDataInput();
    departures.forEach((departure: Departure & { day?: string }) => {
      const groupKey = Number(departure.group) || 0;

      if (!this.groupedDepartures[groupKey]) {
        this.groupKeys.push(groupKey);
        this.groupedDepartures[groupKey] = [];
      }

      const departureGroupKey = `departure${groupKey}`;
      if (!this.formDeparture.get(departureGroupKey)) {
        this.formDeparture.setControl(departureGroupKey, this.fb.array([]));
      }

      const departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray;

      departureFormArrayItem.push(
        this.fb.group({
          date: new FormControl(departure.date || departure.day),
          driver: new FormControl(departure.driver),
          schedule: new FormControl(departure.schedule),
          location: new FormControl(departure.location),
          territory: this.fb.array(
            (departure.territory || []).map((t: string) => new FormControl(t)),
          ),
          point: new FormControl(departure.point),
          maps: new FormControl(departure.maps),
          color: new FormControl(departure.color),
          group: new FormControl(departure.group),
          isEvent: new FormControl(departure.isEvent || false),
          title: new FormControl(departure.title || ''),
          cardStatus: new FormControl(
            departure.isEvent ? 'not_required' : departure.cardStatus || 'pending',
          ),
        }),
      );
    });

    this.groupKeys = [...new Set(this.groupKeys)].sort((a, b) => a - b);
  }
  addNewGroup(): void {
    if (this.isFormDirty) this.isFormDirty.set(true);
    this.groupKeys.push(this.groupKeys.length);
    this.addInputForm(this.groupKeys.length - 1);
  }
  // Obtiene el array de territorios para un día específico
  getTerritoryArray(index: number, group: number): FormArray {
    const groupKey = `departure${group}`;
    const array = this.formDeparture.get(groupKey) as FormArray;
    return array.at(index).get('territory') as FormArray;
  }

  // Devuelve lista de territorios actuales
  getTerritories(dayGroup: AbstractControl): string[] {
    return ((dayGroup.get('territory') as FormArray)?.value as string[]) || [];
  }

  // Verifica si un territorio está seleccionado

  // Agrega o quita un territorio
  toggleTerritory(num: string, i: number, group: number, isChecked: boolean): void {
    const control = this.getTerritoryArray(i, group);
    const current = control.value as string[];

    if (isChecked && !current.includes(num)) {
      control.push(new FormControl(num));
    } else if (!isChecked) {
      const index = current.indexOf(num);
      if (index !== -1) control.removeAt(index);
    }
  }

  isDirty(): boolean {
    return this.formDeparture.dirty;
  }

  submitForm(): Departure[] {
    const targetMondayStr = this.dateDepartureInput();
    const targetMonday = new Date(targetMondayStr + 'T00:00:00');
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    const formDepartures = this.groupKeys
      .map((num) => (this.formDeparture.value as Record<string, Departure[]>)?.[`departure${num}`])
      .flat();

    // Separar salidas: las de esta semana vs. las de otras semanas
    const weeklyOnly: Departure[] = [];
    const otherWeeks: { [weekId: string]: Departure[] } = {};

    formDepartures.forEach((d: Departure) => {
      if (!d.date) {
        weeklyOnly.push(d);
        return;
      }
      const date = new Date(d.date + 'T00:00:00');
      if (isNaN(date.getTime()) || (date >= targetMonday && date <= targetSunday)) {
        weeklyOnly.push(d);
      } else {
        // Esta salida pertenece a otra semana: calcular su lunes
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const otherMonday = new Date(date);
        otherMonday.setDate(diff);
        const otherWeekId = otherMonday.toISOString().split('T')[0];
        if (!otherWeeks[otherWeekId]) {
          otherWeeks[otherWeekId] = [];
        }
        otherWeeks[otherWeekId].push(d);
      }
    });

    // Guardar las salidas de esta semana
    if (targetMondayStr) {
      const normalizedWeeklyOnly = weeklyOnly.map((departure, index) =>
        this.territoryDataService.normalizeDepartureForCardTracking(
          departure,
          targetMondayStr,
          index,
        ),
      );
      const weeklyDeparture: WeeklyDeparture = {
        departure: normalizedWeeklyOnly,
        weekId: targetMondayStr,
        createdAt: new Date(),
      };
      void this.territoryDataService.postWeeklyDeparture(weeklyDeparture);
      weeklyOnly.splice(0, weeklyOnly.length, ...normalizedWeeklyOnly);
    }

    // Guardar las salidas que pertenecen a otras semanas en su semana correspondiente
    // Para cada semana distinta, hacemos un merge con lo que ya existe en Firestore
    Object.entries(otherWeeks).forEach(([otherWeekId, newDepartures]) => {
      this.territoryDataService
        .getWeeklyDeparture(otherWeekId)
        .pipe(take(1))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((existing) => {
          const existingDepartures = existing?.departure || [];
          // Combinar sin duplicar (evitar agregar si ya existe)
          const merged = [...existingDepartures];
          newDepartures.forEach((nd) => {
            const alreadyExists = existingDepartures.some(
              (ed: Departure) =>
                ed.date === nd.date && ed.driver === nd.driver && ed.schedule === nd.schedule,
            );
            if (!alreadyExists) {
              merged.push(nd);
            }
          });
          const otherWeeklyDeparture: WeeklyDeparture = {
            departure: merged,
            weekId: otherWeekId,
            createdAt: new Date(),
          };
          void this.territoryDataService.postWeeklyDeparture(otherWeeklyDeparture);
        });
    });

    this._snackBar.open('✅ Semana y salidas guardadas correctamente', 'Ok', {
      verticalPosition: 'top',
      duration: 3000,
    });

    // Re-inicializar el formulario mostrando solo las salidas de esta semana
    this.initForm(weeklyOnly);
    this.saveCompleted.emit(weeklyOnly);
    return weeklyOnly;
  }
}
