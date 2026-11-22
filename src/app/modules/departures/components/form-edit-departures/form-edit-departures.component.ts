import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  OnInit,
  inject,
  input,
  signal,
  effect,
  model,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  Injector,
  afterNextRender,
  untracked,
  viewChildren,
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
import {
  DepartureDayCardComponent,
  SuggestionChip,
} from '../departure-day-card/departure-day-card.component';
import { TerritorySelectionModalComponent } from '../territory-selection-modal/territory-selection-modal.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { DepartureFormService } from '@core/services/departure-form.service';
import { Departure, DepartureCardStatus, WeeklyDeparture } from '@core/models/Departures';
import { MeetingPoint } from '@core/models/MeetingPoint';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TERRITORY_COUNT } from '@shared/utils/territories.config';
import { environment } from '@environments/environment';

import { User } from '@core/models/User';
import { firstValueFrom, take } from 'rxjs';
import { Card } from '@core/models/Card';
import { Group } from '@core/models/Group';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { AuthService } from '@core/services/auth.service';
import {
  calculateDaysSinceTerritoryCompletion,
  getMostRecentTerritoryCompletionDate,
} from '@shared/utils/territory-completion.utils';
import { normalizeTerritoryNumberDataList } from '@shared/utils/territory-number-data.utils';
import { getWeekId, parseIsoDate } from '@shared/utils/date-utils';
import { DepartureGroupTheme, getDepartureGroupTheme } from '@shared/utils/departure-group-theme';
import { formatDepartureTitle } from '@shared/utils/departure-format.utils';
import { sortDeparturesByDateTime } from '@shared/utils/departure-sort.utils';
import { formatTerritoryAge } from '@shared/utils/territory-age.utils';

export interface WeekSaveResult {
  /** Departures of the saved week, exactly as stored. */
  departures: Departure[];
  /** Departures whose date fell in another week and were stored there. */
  movedToOtherWeeks: number;
}

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

  private readonly destroyRef = inject(DestroyRef);
  private readonly territoryDataService = inject(TerritoryDataService);
  private readonly departureFormService = inject(DepartureFormService);
  private readonly fb = inject(FormBuilder);
  // private fb = inject();
  private readonly _snackBar = inject(MatSnackBar);
  public readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  formDeparture: FormGroup;
  groupKeys: number[] = [];
  groupedDepartures: { [key: string]: Departure[] } = {};
  readonly formDepartureDataInput = input<Departure[]>([] as Departure[]);
  readonly dateDepartureInput = input<string>('');
  readonly meetingPointsInput = input<MeetingPoint[]>([]);
  /** True when the input departures are an unsaved draft (e.g. copied from another week). */
  readonly draftOnLoad = input<boolean>(false);
  readonly isFormDirty = model<boolean>(false);
  readonly isSaving = signal(false);
  readonly meetingPointsListId = 'meeting-points-list';
  private readonly injector = inject(Injector);
  private readonly dayCards = viewChildren(DepartureDayCardComponent);
  private readonly noSuggestions: SuggestionChip[] = [];
  /** Card status each departure had when the week was loaded, to protect remote reviews on save. */
  private loadedCardStatuses: Record<string, DepartureCardStatus | undefined> = {};

  drivers = signal<User[]>([]);
  congregationName = environment.congregationName;
  territoryPrefix = environment.territoryPrefix;
  congregationKey = environment.congregationKey;
  localities = environment.localities;
  territoryOptionsMap = signal<{ [key: string]: string[] }>({});
  isAdmin: boolean = false;
  activeModal = signal<{ dayIndex: number; groupKey: number } | null>(null);
  territoryCompletionDataStatus = signal<Record<string, 'loading' | 'ready' | 'error'>>({});
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
  publisherGroups = signal<Group[]>([]);
  private readonly territoryCompletionRequestIds = new Map<string, number>();
  numberTerritoryData: Record<string, unknown> = {};
  constructor() {
    this.isAdmin = this.authService.isAdmin();
    this.formDeparture = this.departureFormService.createForm();

    // Recarga el formulario solo cuando cambian las salidas de entrada. Todo lo demás
    // (grupos, semana, borrador) se lee sin seguimiento para no descartar lo que se está editando.
    effect(() => {
      const departures = this.formDepartureDataInput();
      untracked(() => {
        this.initForm(departures);
        if (this.draftOnLoad()) this.markChanged();
      });
    });
  }
  ngOnInit(): void {
    this.loadTerritoryData();
    this.loadDrivers();
    this.loadPersonalAssignments();
    this.loadWeeklyHistory();
    this.loadTerritoryGroups();
    this.loadPublisherGroups();

    this.formDeparture.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.formDeparture.dirty && !this.isFormDirty()) {
        this.isFormDirty.set(true);
      }
    });
  }

  initForm(departures: Departure[]): void {
    const targetMondayStr = this.dateDepartureInput();
    const result = this.departureFormService.initForm(
      this.formDeparture,
      departures,
      targetMondayStr,
    );
    this.groupKeys = result.groupKeys;
    this.groupedDepartures = result.groupedDepartures;

    this.ensureGroupKeys();

    this.loadedCardStatuses = this.collectCardStatuses(departures);
    this.formDeparture.markAsPristine();
    this.isFormDirty.set(false);

    this.cdr.markForCheck();
  }

  private collectCardStatuses(
    departures: readonly Departure[],
  ): Record<string, DepartureCardStatus | undefined> {
    const statuses: Record<string, DepartureCardStatus | undefined> = {};
    for (const departure of departures) {
      if (departure.departureId) {
        statuses[departure.departureId] = departure.isEvent
          ? 'not_required'
          : (departure.cardStatus ?? 'pending');
      }
    }
    return statuses;
  }

  /** Marks the form as having unsaved changes, including edits made programmatically. */
  private markChanged(): void {
    this.formDeparture.markAsDirty();
    if (!this.isFormDirty()) this.isFormDirty.set(true);
    this.cdr.markForCheck();
  }

  loadPublisherGroups(): void {
    this.territoryDataService
      .getGroupList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        let parsedGroups: Group[] = [];
        if (Array.isArray(data)) {
          parsedGroups = data.map((group) => ({
            id: group.id,
            publishers: Array.isArray(group.publishers) ? group.publishers : [],
          }));
        }

        parsedGroups.sort((a, b) => {
          const numA = Number.parseInt(a.id.replace('Grupo ', '')) || 0;
          const numB = Number.parseInt(b.id.replace('Grupo ', '')) || 0;
          return numA - numB;
        });

        this.publisherGroups.set(parsedGroups);
        this.ensureGroupKeys();
      });
  }

  ensureGroupKeys(): void {
    const configuredGroups = [
      0,
      ...this.publisherGroups().map((g: Group) => parseInt(g.id.replace('Grupo ', '')) || 0),
    ];
    let changed = false;

    // Remove groupKeys that are not in configuredGroups (except those that have actual departures)
    // Actually, we should probably keep any group that has existing departures,
    // even if it was deleted from manage-publishers, to avoid data loss.
    // So we just ADD missing groups.

    configuredGroups.forEach((g) => {
      if (!this.groupKeys.includes(g)) {
        this.groupKeys.push(g);
        changed = true;
      }
      const groupArrayKey = `departure${g}`;
      if (!this.formDeparture.get(groupArrayKey)) {
        this.formDeparture.setControl(groupArrayKey, this.fb.array([]));
        changed = true;
      }
    });

    if (changed) {
      // Sort groupKeys numerically
      this.groupKeys.sort((a, b) => a - b);
      this.cdr.markForCheck();
    }
  }

  loadTerritoryData(): void {
    const stored = sessionStorage.getItem('numberTerritory');
    if (stored) {
      this.processTerritoryData(JSON.parse(stored) as Record<string, unknown>);
    } else {
      this.territoryDataService
        .getNumberTerritory()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(
          (numbers: import('@core/models/TerritoryNumberData').TerritoriesNumberData[]) => {
            const mergedData = numbers.reduce(
              (
                acc: Record<string, unknown>,
                curr: import('@core/models/TerritoryNumberData').TerritoriesNumberData,
              ) => {
                return { ...acc, ...curr };
              },
              {},
            );
            sessionStorage.setItem('numberTerritory', JSON.stringify(mergedData));
            this.processTerritoryData(mergedData);
          },
        );
    }
  }
  processTerritoryData(data: Record<string, unknown>): void {
    this.numberTerritoryData = data;
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

        const sorted = [...numbers].sort((a: unknown, b: unknown) => Number(a) - Number(b));
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

    void this.loadAllTerritoryCompletionData(data).catch((error: unknown) => {
      this.reportTerritoryCompletionDataError(error);
    });
  }

  async loadAllTerritoryCompletionData(data: Record<string, unknown>): Promise<void> {
    const promises = [];
    for (const loc of this.localities) {
      if (loc.hasNumberedTerritories) {
        const territories = normalizeTerritoryNumberDataList(data[loc.key]);
        if (territories.length > 0) {
          promises.push(this.loadTerritoryCompletionData(loc, territories));
        }
      }
    }
    await Promise.all(promises);
  }

  async loadTerritoryCompletionData(
    loc: { territoryPrefix: string; key: string; hasNumberedTerritories: boolean },
    territories: TerritoryNumberData[],
  ): Promise<void> {
    // Nothing to refresh: keep the last known values instead of wiping them.
    if (territories.length === 0) return;

    const locationPrefix = loc.territoryPrefix;
    const requestId = (this.territoryCompletionRequestIds.get(locationPrefix) ?? 0) + 1;
    this.territoryCompletionRequestIds.set(locationPrefix, requestId);
    this.territoryCompletionDataStatus.update((current) => ({
      ...current,
      [locationPrefix]: 'loading',
    }));

    const results = await Promise.allSettled(
      territories.map(async (territory) => {
        const cards = await this.territoryDataService.getRecentCardsFromServer(
          territory.collection,
        );
        const latestCompletionDate = getMostRecentTerritoryCompletionDate(cards);
        return [
          territory.territorio,
          calculateDaysSinceTerritoryCompletion(latestCompletionDate),
        ] as const;
      }),
    );
    if (this.territoryCompletionRequestIds.get(locationPrefix) !== requestId) return;

    const completionDays: Record<number, number> = {
      ...this.territoryLastCompletedDays()[locationPrefix],
    };
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const [territoryNumber, daysSinceCompletion] = result.value;
      completionDays[territoryNumber] = daysSinceCompletion;
    }
    this.territoryLastCompletedDays.update((current) => ({
      ...current,
      [locationPrefix]: completionDays,
    }));

    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    this.territoryCompletionDataStatus.update((current) => ({
      ...current,
      [locationPrefix]: failures.length > 0 ? 'error' : 'ready',
    }));
    if (failures.length === 0) return;

    failures.forEach((failure) => {
      console.error(
        `[FormEditDepartures] Error refreshing territory completion data for ${locationPrefix}:`,
        failure.reason,
      );
    });
    throw new Error(
      `Could not refresh completion data for ${failures.length} territory/territories in ${locationPrefix}.`,
    );
  }

  private reportTerritoryCompletionDataError(error: unknown): void {
    console.error('[FormEditDepartures] Could not load territory completion data:', error);
    this._snackBar.open(
      'No se pudieron actualizar las fechas de finalización de los territorios.',
      'Cerrar',
      { verticalPosition: 'top', duration: 5000 },
    );
  }

  loadDrivers(): void {
    this.territoryDataService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        // Se ordena por el nombre que se muestra en la lista, no por el usuario interno.
        const shownName = (user: User): string => user.displayName || user.user;
        const sortedUsers = [...users].sort((a, b) => shownName(a).localeCompare(shownName(b)));
        this.drivers.set(sortedUsers);
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
      .getWeeklyDepartures(15)
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
    const locationPrefix = String(
      this.getCurrentDepartureControl(dayIndex, groupKey)?.get('location')?.value ?? '',
    );
    const normalizedLocation = locationPrefix.toLowerCase();
    const locality = this.localities.find((candidate) =>
      [candidate.territoryPrefix, candidate.key, candidate.name]
        .filter(Boolean)
        .some((name) => String(name).toLowerCase() === normalizedLocation),
    );
    if (locality) {
      const territories = normalizeTerritoryNumberDataList(this.numberTerritoryData[locality.key]);
      void this.loadTerritoryCompletionData(locality, territories).catch((error: unknown) => {
        this.reportTerritoryCompletionDataError(error);
      });
    }
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
    const numericNum = this.normalizeTerritoryNumber(num);
    if (numericNum !== -1 && this.territoryGroupsMap()[locationPrefix]?.[numericNum]) {
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

  /** Suggested territories with how long ago each one was completed. */
  getSuggestionChips(index: number, group: number): SuggestionChip[] {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control || control.get('isEvent')?.value) return this.noSuggestions;
    if (this.getTerritories(control).length > 0) return this.noSuggestions;

    const location = this.getControlValue(index, group, 'location') as string;
    const dataReady = this.territoryCompletionDataStatus()[location] === 'ready';

    return this.getSuggestedTerritories(index, group).map((territory) => {
      const days = this.getTerritoryLastUsedDays(territory, location);
      return {
        territory,
        ageLabel: Number.isFinite(days) || dataReady ? formatTerritoryAge(days) : '',
      };
    });
  }

  /** Meeting point used the last time the selected (or suggested) territories went out. */
  getSuggestedPointName(index: number, group: number): string {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control || control.get('isEvent')?.value) return '';
    return this.getSuggestedMeetingDetails(index, group).point;
  }

  applySuggestedPoint(index: number, group: number): void {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control) return;

    const suggestion = this.getSuggestedMeetingDetails(index, group);
    if (!suggestion.point) return;

    const knownPoint = this.meetingPointsInput().find(
      (point) => point.name.toLowerCase() === suggestion.point.toLowerCase(),
    );
    control.get('point')?.setValue(suggestion.point);
    control.get('maps')?.setValue(suggestion.maps || knownPoint?.mapsUrl || '');
    this.markChanged();
  }

  /** "Martes 10 nov · 18:30 · Grupo 1": names the departure the territory modal is editing. */
  getModalTitle(): string {
    const modal = this.activeModal();
    const control = this.activeModalDays;
    if (!modal || !control) return '';

    const title = formatDepartureTitle(
      String(control.get('date')?.value ?? ''),
      String(control.get('schedule')?.value ?? ''),
    );
    return modal.groupKey > 0 ? `${title} · ${this.getGroupTitle(modal.groupKey)}` : title;
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
    this.markChanged();
  }

  /** Scrolls to a departure card and focuses its first field. */
  revealDeparture(group: number, index: number): void {
    this.dayCards()
      .find((card) => card.groupIndex() === group && card.index() === index)
      ?.reveal();
  }

  getCurrentDepartures(): Departure[] {
    const formDepartures = this.groupKeys
      .map((num) => (this.formDeparture.value as Record<string, Departure[]>)?.[`departure${num}`])
      .flat()
      .filter(Boolean);
    return formDepartures;
  }

  private normalizeTerritoryNumber(value: string): number {
    const match = /\d+/.exec(String(value));
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
  getGroupTheme(group: number): DepartureGroupTheme {
    return getDepartureGroupTheme(group);
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
    const isEvent = Boolean(currentControl.get('isEvent')?.value);
    newControl.patchValue({
      ...(currentControl.value as Record<string, unknown>),
      // The copy is a new departure: it needs its own id and a fresh card.
      departureId: '',
      cardStatus: isEvent ? 'not_required' : 'pending',
    });

    // Copy territory array values manually
    const sourceTerritories =
      ((currentControl.get('territory') as FormArray)?.value as string[]) || [];
    const targetTerritoryArray = newControl.get('territory') as FormArray;
    targetTerritoryArray.clear();
    sourceTerritories.forEach((t: string) => targetTerritoryArray.push(new FormControl(t)));

    // Place the copy right below the original instead of at the end of the group
    departureFormArrayItem.removeAt(departureFormArrayItem.length - 1);
    departureFormArrayItem.insert(index + 1, newControl);
    this.markChanged();
    this.revealAfterRender(group, index + 1);
  }

  private revealAfterRender(group: number, index: number): void {
    afterNextRender(() => this.revealDeparture(group, index), { injector: this.injector });
  }

  addControl(group: number): void {
    const targetMondayStr = this.dateDepartureInput();
    this.departureFormService.addControl(this.formDeparture, group, targetMondayStr);
    this.markChanged();
    this.revealAfterRender(group, this.filterControlsByGroup(group).length - 1);
  }

  removeControl(index: number, group: number): void {
    this.departureFormService.removeControl(this.formDeparture, index, group);
    this.markChanged();
  }

  addInputForm(group: number): void {
    this.addControl(group);
  }
  /** Removes a departure and offers to undo it for a few seconds. */
  deleteInputForm(index: number, group: number): void {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray | null;
    const removed = departureFormArrayItem?.at(index);
    if (!departureFormArrayItem || !removed) return;

    departureFormArrayItem.removeAt(index);
    this.markChanged();

    this._snackBar
      .open('Salida quitada', 'Deshacer', { verticalPosition: 'top', duration: 6000 })
      .onAction()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        departureFormArrayItem.insert(Math.min(index, departureFormArrayItem.length), removed);
        this.markChanged();
      });
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

      const defaultLocation =
        this.localities && this.localities.length > 0 ? this.localities[0].territoryPrefix : '';
      const fallbackLocation = departure.location || defaultLocation;
      const initialLocation =
        departure.location === 'Seleccionar localidad' ? defaultLocation : fallbackLocation;

      departureFormArrayItem.push(
        this.fb.group({
          date: new FormControl(departure.date || departure.day),
          driver: new FormControl(departure.driver),
          schedule: new FormControl(departure.schedule),
          location: new FormControl(initialLocation),
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

  /**
   * Saves the week shown in the form (and any departure dated in another week to that week).
   * Resolves once Firestore confirmed the write; rejects, leaving the edits untouched, otherwise.
   */
  async submitForm(): Promise<WeekSaveResult> {
    const targetMondayStr = this.dateDepartureInput();
    if (!targetMondayStr) throw new Error('No week selected');

    this.isSaving.set(true);
    try {
      const { weeklyOnly, otherWeeks } = this.splitByWeek(
        this.getCurrentDepartures(),
        targetMondayStr,
      );

      const sortedWeekly = this.ensureUniqueDepartureIds(
        sortDeparturesByDateTime(weeklyOnly),
        targetMondayStr,
      );
      const savedDepartures = await this.territoryDataService.saveWeeklyDepartureKeepingCardStatus(
        {
          departure: sortedWeekly,
          weekId: targetMondayStr,
          createdAt: new Date(),
        },
        this.loadedCardStatuses,
      );

      let movedToOtherWeeks = 0;
      for (const [otherWeekId, newDepartures] of Object.entries(otherWeeks)) {
        await this.mergeIntoOtherWeek(otherWeekId, newDepartures);
        movedToOtherWeeks += newDepartures.length;
      }

      this.initForm(savedDepartures);
      return { departures: savedDepartures, movedToOtherWeeks };
    } finally {
      this.isSaving.set(false);
    }
  }

  private splitByWeek(
    departures: Departure[],
    targetWeekId: string,
  ): { weeklyOnly: Departure[]; otherWeeks: Record<string, Departure[]> } {
    const weeklyOnly: Departure[] = [];
    const otherWeeks: Record<string, Departure[]> = {};

    for (const departure of departures) {
      const date = parseIsoDate(departure.date);
      const departureWeekId = date ? getWeekId(date) : targetWeekId;

      if (departureWeekId === targetWeekId) {
        weeklyOnly.push(departure);
      } else {
        otherWeeks[departureWeekId] = [...(otherWeeks[departureWeekId] ?? []), departure];
      }
    }
    return { weeklyOnly, otherWeeks };
  }

  /** Every departure needs an id of its own: card tracking finds departures by it. */
  private ensureUniqueDepartureIds(departures: Departure[], weekId: string): Departure[] {
    const used = new Set<string>();

    return departures.map((departure, index) => {
      const current = departure.departureId;
      if (current && !used.has(current)) {
        used.add(current);
        return departure;
      }

      const base = this.territoryDataService.createDepartureId(
        weekId,
        { ...departure, departureId: undefined },
        index,
      );
      let candidate = base;
      let suffix = 2;
      while (used.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix++;
      }
      used.add(candidate);
      return { ...departure, departureId: candidate };
    });
  }

  private async mergeIntoOtherWeek(weekId: string, newDepartures: Departure[]): Promise<void> {
    const existing = await firstValueFrom(
      this.territoryDataService.getWeeklyDeparture(weekId).pipe(take(1)),
    );
    const merged = [...(existing?.departure ?? [])];

    for (const departure of newDepartures) {
      const alreadyExists = merged.some(
        (stored) =>
          stored.date === departure.date &&
          stored.driver === departure.driver &&
          stored.schedule === departure.schedule,
      );
      if (!alreadyExists) merged.push(departure);
    }

    const week: WeeklyDeparture = { departure: merged, weekId, createdAt: new Date() };
    await this.territoryDataService.postWeeklyDeparture(week);
  }
}
