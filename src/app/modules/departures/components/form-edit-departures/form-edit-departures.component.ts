import {
  Component,
  OnInit,
  inject,
  input,
  signal,
  effect,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Departure } from '../../../../core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import {
  MatSnackBar,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { TERRITORY_COUNT } from '@shared/utils/territories.config';
import { environment } from '@environments/environment';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { User } from '@core/models/User';
import { WeeklyDeparture } from '../../../../core/models/Departures';
import { take } from 'rxjs';
import { Card } from '@core/models/Card';

@Component({
  selector: 'app-form-edit-departures',
  templateUrl: './form-edit-departures.component.html',
  styleUrls: ['./form-edit-departures.component.scss'],
  imports: [ReactiveFormsModule],
})
export class FormEditDeparturesComponent implements OnInit {
  private territoryDataService = inject(TerritoryDataService);
  private fb = inject(FormBuilder);
  private spinner = inject(SpinnerService);
  private _snackBar = inject(MatSnackBar);

  numberGroup: number = 0;
  formDeparture: FormGroup;
  selectedColor: string = 'primary';
  groupKeys: number[] = [];
  groupedDepartures: { [key: string]: Departure[] } = {};
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  readonly formDepartureDataInput = input<Departure[]>([] as Departure[]);
  readonly dateDepartureInput = input<string>('');
  drivers = signal<User[]>([]);
  congregationName = environment.congregationName;
  territoryPrefix = environment.territoryPrefix;
  congregationKey = environment.congregationKey;
  localities = environment.localities;
  territoryOptionsMap: { [key: string]: string[] } = {};
  isSaved: boolean = false;
  isAdmin: boolean = false;
  personalAssignments: Card[] = [];
  showPersonalTerritories: boolean = false;
  sortByAge: boolean = true;
  weeklyHistory: WeeklyDeparture[] = [];
  territoryLastCompletedDays: { [locationPrefix: string]: { [num: number]: number } } = {};
  // territoryGroupsMap: { [locationPrefix: string]: { [territoryNum: number]: number } }
  // Maps location prefix -> territory number -> group number (1, 2, 3...)
  territoryGroupsMap: { [locationPrefix: string]: { [territoryNum: number]: number } } = {};
  selectedTerritoryGroup: number | null = null; // null = todos
  availableGroupNumbers: number[] = []; // grupos disponibles para la localidad actual

  colorSwatchMap: { [key: string]: string } = {
    secondary: '#64748b',
    primary: '#3b82f6',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#38bdf8',
    light: '#f8fafc',
    dark: '#0f172a',
  };

  private readonly CARD_TRACKING_START_DATE = '2026-05-11';

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    this.isAdmin = !!localStorage.getItem('tokenAdmin');
    this.formDeparture = this.fb.group({
      departure0: new FormArray([]),
    });

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
  }

  initForm(departures: Departure[]) {
    this.isSaved = false;
    this.groupKeys = [];
    this.groupedDepartures = {};

    // Limpiar todos los FormArrays existentes
    Object.keys(this.formDeparture.controls).forEach((key) => {
      if (key.startsWith('departure')) {
        (this.formDeparture.get(key) as FormArray).clear();
      }
    });

    if (!departures || departures.length === 0) {
      // Si no hay datos, inicializamos con un grupo vacío por defecto
      this.groupKeys = [0];
      return;
    }

    const targetMondayStr = this.dateDepartureInput();
    const targetMonday = new Date(targetMondayStr + 'T00:00:00');
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    // Filtrar: Solo salidas que pertenezcan a la semana seleccionada
    const filteredDepartures = departures.filter((departure: Departure) => {
      if (!departure.date) return true; // Permitir si no tiene fecha definida aún
      const d = new Date(departure.date + 'T00:00:00');
      if (isNaN(d.getTime())) return true;
      return d >= targetMonday && d <= targetSunday;
    });

    if (filteredDepartures.length === 0) {
      this.groupKeys = [0];
      return;
    }

    filteredDepartures.forEach((departure: Departure) => {
      const rawGroup = Number(departure.group);
      const groupKey = isNaN(rawGroup) ? 0 : rawGroup;

      if (!this.groupedDepartures[groupKey]) {
        this.groupKeys.push(groupKey);
        this.groupedDepartures[groupKey] = [];
      }
      this.groupedDepartures[groupKey].push(departure);

      const groupArrayKey = `departure${groupKey}`;
      let groupArray = this.formDeparture.get(groupArrayKey) as FormArray;
      if (!groupArray) {
        groupArray = this.fb.array([]);
        this.formDeparture.setControl(groupArrayKey, groupArray);
      }

      // Normalizar location
      const locality = this.localities.find(
        (l) => l.key === departure.location,
      );
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
            departure.isEvent
              ? 'not_required'
              : departure.cardStatus || 'pending',
          ),
        }),
      );
    });

    // Asegurar que groupKeys esté ordenado y no tenga duplicados
    // Siempre incluir el grupo 0 (Salidas Generales) para que el botón "Nueva salida +" esté disponible
    this.groupKeys = [...new Set([0, ...this.groupKeys])].sort((a, b) => a - b);
  }
  loadTerritoryData() {
    const stored = sessionStorage.getItem('numberTerritory');
    if (stored) {
      this.processTerritoryData(JSON.parse(stored));
    } else {
      this.territoryDataService
        .getNumberTerritory()
        .subscribe((numbers: TerritoryNumberData[]) => {
          const mergedData = numbers.reduce((acc: any, curr: any) => {
            return { ...acc, ...curr };
          }, {});
          sessionStorage.setItem('numberTerritory', JSON.stringify(mergedData));
          this.processTerritoryData(mergedData);
        });
    }
  }
  processTerritoryData(data: any) {
    this.localities.forEach((loc) => {
      if (loc.hasNumberedTerritories) {
        const rawData = data[loc.key] || [];
        const numbers = rawData
          .map((item: any) => {
            if (
              typeof item === 'object' &&
              item !== null &&
              'territorio' in item
            ) {
              return item.territorio;
            }
            return item;
          })
          .filter((n: any) => typeof n === 'number' || !isNaN(Number(n)));

        const sorted = numbers.sort(
          (a: number, b: number) => Number(a) - Number(b),
        );
        const options = sorted.map((n: number) => `N°${n}`);

        this.territoryOptionsMap[loc.territoryPrefix] = options;
        if (loc.key) {
          this.territoryOptionsMap[loc.key] = options;
        }
      } else {
        const options = ['Rural'];
        this.territoryOptionsMap[loc.territoryPrefix] = options;
        if (loc.key) {
          this.territoryOptionsMap[loc.key] = options;
        }
      }
    });

    if (
      !this.territoryOptionsMap[this.territoryPrefix] &&
      (!data || Object.keys(data).length === 0)
    ) {
      this.territoryOptionsMap[this.territoryPrefix] = Array.from(
        { length: TERRITORY_COUNT },
        (_, i) => `N°${i + 1}`,
      );
    }

    const departures = this.formDepartureDataInput();
    if (departures.length > 0) {
      this.initForm(departures);
    }
    this.loadAllTerritoryCompletionData(data);
  }

  async loadAllTerritoryCompletionData(data: any) {
    const promises = [];
    for (const loc of this.localities) {
      if (loc.hasNumberedTerritories) {
        const rawData = data[loc.key] || [];
        const territories = rawData.filter((t: any) => t && typeof t === 'object' && t.collection && t.territorio);
        if (territories.length > 0) {
          promises.push(this.loadTerritoryCompletionData(loc, territories));
        }
      }
    }
    await Promise.all(promises);
  }

  async loadTerritoryCompletionData(loc: any, territories: any[]) {
    const locationPrefix = loc.territoryPrefix;
    if (!this.territoryLastCompletedDays[locationPrefix]) {
      this.territoryLastCompletedDays[locationPrefix] = {};
    }

    const path = loc.key;
    const suffix = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, '');
    
    const storageKeys = [`statisticData${suffix}_6`, `statisticData${suffix}_12`, `statisticData${suffix}_24`];
    for (const key of storageKeys) {
      const cachedData = sessionStorage.getItem(key);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          parsedData.forEach((territoryCards: any[]) => {
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
                  const dateToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  let dateCard: Date;
                  if (typeof lastEnd === 'string' || typeof lastEnd === 'number') {
                    dateCard = new Date(lastEnd);
                  } else if (lastEnd && typeof (lastEnd as any).toDate === 'function') {
                    dateCard = (lastEnd as any).toDate();
                  } else if (lastEnd && typeof (lastEnd as any).seconds === 'number') {
                    dateCard = new Date((lastEnd as any).seconds * 1000);
                  } else {
                    dateCard = new Date(lastEnd);
                  }

                  if (!isNaN(dateCard.getTime())) {
                    const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
                    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                    this.territoryLastCompletedDays[locationPrefix][num] = days;
                  } else {
                    this.territoryLastCompletedDays[locationPrefix][num] = Infinity;
                  }
                } else {
                  this.territoryLastCompletedDays[locationPrefix][num] = Infinity;
                }
              }
            }
          });
          return;
        } catch (e) {}
      }
    }

    const promises = territories.map((t: any) =>
      new Promise<void>((resolve) => {
        this.territoryDataService.getCardTerritorie(t.collection, 120).pipe(take(1)).subscribe(cards => {
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
            } else if (lastEnd && typeof (lastEnd as any).toDate === 'function') {
              dateCard = (lastEnd as any).toDate();
            } else if (lastEnd && typeof (lastEnd as any).seconds === 'number') {
              dateCard = new Date((lastEnd as any).seconds * 1000);
            } else {
              dateCard = new Date(lastEnd);
            }

            if (!isNaN(dateCard.getTime())) {
              const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
              const days = Math.floor(difference / (1000 * 60 * 60 * 24));
              this.territoryLastCompletedDays[locationPrefix][t.territorio] = days;
            } else {
              this.territoryLastCompletedDays[locationPrefix][t.territorio] = Infinity;
            }
          } else {
            this.territoryLastCompletedDays[locationPrefix][t.territorio] = Infinity;
          }
          resolve();
        });
      })
    );
    await Promise.all(promises);
  }

  loadDrivers() {
    this.territoryDataService.getUsers().subscribe((users) => {
      this.drivers.set(users.sort((a, b) => a.user.localeCompare(b.user)));
    });
  }

  loadPersonalAssignments() {
    this.territoryDataService
      .getCardAssigned()
      .subscribe((cards) => (this.personalAssignments = cards || []));
  }

  loadWeeklyHistory() {
    this.territoryDataService.getWeeklyDepartures().subscribe((history) => {
      this.weeklyHistory = history;
    });
  }

  loadTerritoryGroups() {
    this.territoryDataService.getTerritoryGroups().subscribe((data: any) => {
      if (!data) return;
      // data shape: { [locationPrefix]: { [territoryNum]: groupNumber } }
      this.territoryGroupsMap = data;
    });
  }

  async saveTerritoryGroups() {
    await this.territoryDataService.saveTerritoryGroups(this.territoryGroupsMap);
  }

  /**
   * Returns the group number assigned to a territory, or 0 if not assigned.
   */
  getTerritoryGroupNumber(num: string, locationPrefix: string): number {
    const n = this.normalizeTerritoryNumber(num);
    const locMap = this.territoryGroupsMap[locationPrefix];
    if (locMap && locMap[n] !== undefined) return locMap[n];
    // fallback: check by alternate location names
    for (const loc of this.localities) {
      const names = [loc.territoryPrefix, loc.key, loc.name].map(s => s?.toLowerCase());
      const locationNames = this.getLocationNames(locationPrefix);
      if (locationNames.some(name => names.includes(name))) {
        const altMap = this.territoryGroupsMap[loc.territoryPrefix];
        if (altMap && altMap[n] !== undefined) return altMap[n];
      }
    }
    return 0;
  }

  /**
   * Assigns a territory to a departure group (for the admin config panel).
   */
  setTerritoryGroupAssignment(num: string, locationPrefix: string, groupNum: number | null) {
    if (!this.territoryGroupsMap[locationPrefix]) {
      this.territoryGroupsMap[locationPrefix] = {};
    }
    const n = this.normalizeTerritoryNumber(num);
    if (groupNum === null || groupNum === 0) {
      delete this.territoryGroupsMap[locationPrefix][n];
    } else {
      this.territoryGroupsMap[locationPrefix][n] = groupNum;
    }
  }

  /**
   * Returns distinct group numbers that have territories assigned in a location.
   */
  getAvailableGroupNumbers(locationPrefix: string): number[] {
    const locMap = this.territoryGroupsMap[locationPrefix] || {};
    const nums = new Set<number>(Object.values(locMap).filter(v => v > 0));
    return Array.from(nums).sort((a, b) => a - b);
  }

  getTerritoryList(locationPrefix: string): string[] {
    if (!locationPrefix || locationPrefix === 'Seleccionar localidad')
      return [];

    // If exact match found
    if (this.territoryOptionsMap[locationPrefix])
      return this.territoryOptionsMap[locationPrefix];

    // Fallback: search by checking against all prefixes if logic is complex,
    // but here we just return empty or default.
    // If 'Rural' (TerritorioR) was not in localities for some reason, we might miss it.
    if (locationPrefix === 'TerritorioR') return ['Rural'];

    return [];
  }

  getFilteredTerritoryList(
    locationPrefix: string,
    index: number,
    group: number,
  ): string[] {
    return this.getTerritoryList(locationPrefix)
      .filter((num) => {
        // Always show already-checked territories
        if (this.isTerritoryChecked(num, index, group)) return true;
        // Filter by selected group
        if (this.selectedTerritoryGroup !== null) {
          const assignedGroup = this.getTerritoryGroupNumber(num, locationPrefix);
          if (assignedGroup !== this.selectedTerritoryGroup) return false;
        }
        // Filter personal territories
        if (!this.showPersonalTerritories && this.isPersonalTerritory(num, locationPrefix)) return false;
        return true;
      })
      .sort((a, b) => {
        // Territorios ya elegidos esta semana — siempre al final
        const aUsed = this.isTerritoryUsedInWeek(a, locationPrefix, index, group) ? 1 : 0;
        const bUsed = this.isTerritoryUsedInWeek(b, locationPrefix, index, group) ? 1 : 0;
        if (aUsed !== bUsed) return aUsed - bUsed;

        // Territorios personales — al final (antes de los ya elegidos)
        const aPersonal = this.isPersonalTerritory(a, locationPrefix) && !this.isTerritoryChecked(a, index, group) ? 1 : 0;
        const bPersonal = this.isPersonalTerritory(b, locationPrefix) && !this.isTerritoryChecked(b, index, group) ? 1 : 0;
        if (aPersonal !== bPersonal) return aPersonal - bPersonal;

        if (this.sortByAge) {
          // Ordenar por antigüedad: más días sin usar primero (rojo antes que verde)
          const aDays = this.getTerritoryLastUsedDays(a, locationPrefix);
          const bDays = this.getTerritoryLastUsedDays(b, locationPrefix);
          // Sin historial (Infinity) va primero
          if (aDays !== bDays) return bDays - aDays;
        }

        // Mismo nivel de antigüedad o sin sortByAge: orden numérico
        return this.normalizeTerritoryNumber(a) - this.normalizeTerritoryNumber(b);
      });
  }

  getTerritoryLink(locationPrefix: string | undefined, territoryNum: string): string {
    const prefix = locationPrefix || this.territoryPrefix;
    const num = String(territoryNum).match(/\d+/)?.[0] || territoryNum;
    return `https://territorios-${this.congregationKey}.web.app/territorios/${prefix}-${num}`;
  }

  isPersonalTerritory(num: string, locationPrefix: string): boolean {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);

    return this.personalAssignments.some((assignment) => {
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

  getPersonalPublisher(num: string, locationPrefix: string): string {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);
    const assignment = this.personalAssignments.find((item) => {
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
        const sameLocation = locationNames.some((name) =>
          controlLocationNames.includes(name),
        );
        if (!sameLocation) return false;

        return this.getTerritories(control).some(
          (selected) => this.normalizeTerritoryNumber(selected) === territoryNumber,
        );
      });
    });
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

  getCardStatusLabel(dayGroup: AbstractControl): string {
    const isEvent = dayGroup.get('isEvent')?.value;
    if (isEvent) return 'No requerida';
    const status = dayGroup.get('cardStatus')?.value;
    if (status === 'received') return 'Recibida';
    return 'Pendiente';
  }

  getCardStatusClass(dayGroup: AbstractControl): string {
    const isEvent = dayGroup.get('isEvent')?.value;
    if (isEvent) 
      return 'bg-secondary text-light';
    const status = dayGroup.get('cardStatus')?.value;
    if (status === 'received') 
      return 'bg-success text-light';
    return 'bg-warning text-dark';
  }


  isBeforeTrackingStart(dateStr: string): boolean {
    if (!dateStr) return false;
    return dateStr < this.CARD_TRACKING_START_DATE;
  }

  /**
   * Retorna cuántos días hace que se COMPLETÓ un territorio.
   * Infinity = nunca completado (prioridad máxima — aparece primero en rojo).
   */
  getTerritoryLastUsedDays(num: string, locationPrefix: string): number {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);

    let foundDays = Infinity;

    if (this.territoryLastCompletedDays[locationPrefix] && 
        this.territoryLastCompletedDays[locationPrefix][territoryNumber] !== undefined) {
      foundDays = this.territoryLastCompletedDays[locationPrefix][territoryNumber];
    } else {
      for (const loc of this.localities) {
        if (locationNames.includes(loc.territoryPrefix.toLowerCase()) || 
            locationNames.includes(loc.key.toLowerCase())) {
          if (this.territoryLastCompletedDays[loc.territoryPrefix] && 
              this.territoryLastCompletedDays[loc.territoryPrefix][territoryNumber] !== undefined) {
            foundDays = this.territoryLastCompletedDays[loc.territoryPrefix][territoryNumber];
            break;
          }
        }
      }
    }

    return foundDays;
  }

  /**
   * Retorna una etiqueta human-friendly de la antigüedad del territorio.
   * Ejemplos: "Nunca", "Hace 3 sem", "Hace 2 meses".
   */
  getTerritoryAgeLabel(num: string, locationPrefix: string): string {
    const days = this.getTerritoryLastUsedDays(num, locationPrefix);
    if (!isFinite(days)) return 'Nunca';
    if (days < 7) return `Hace ${days}d`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  /**
   * Retorna la clase de color de fila según antigüedad del territorio.
   * Misma lógica que paintRow() en la pantalla de estadísticas.
   */
  getTerritoryPriorityColor(num: string, locationPrefix: string): string {
    const days = this.getTerritoryLastUsedDays(num, locationPrefix);
    if (!isFinite(days) || days >= 57) return 'danger';
    if (days >= 43) return 'warning';
    if (days >= 29) return 'primary';
    return 'success';
  }

  getCurrentDepartureControl(index: number, group: number): AbstractControl | null {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(
      departureGroupKey,
    ) as FormArray;
    return departureFormArrayItem?.at(index) ?? null;
  }

  getSuggestedTerritories(index: number, group: number): string[] {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control) return [];

    const location = this.getControlValue(index, group, 'location');
    return this.getFilteredTerritoryList(location, index, group)
      .filter((territory) => !this.getTerritories(control).includes(territory))
      .slice(0, 3);
  }

  getColorSwatch(colorKey: string | null | undefined): string {
    return this.colorSwatchMap[colorKey || 'secondary'] || this.colorSwatchMap['secondary'];
  }

  getQuickSuggestionText(index: number, group: number): string {
    const suggestion = this.getSuggestedMeetingDetails(index, group);
    if (!suggestion.point) return '';

    return `Punto: ${suggestion.point}`;
  }

  hasQuickMeetingSuggestions(index: number, group: number): boolean {
    return !!this.getQuickSuggestionText(index, group);
  }

  getControlValue(index: number, group: number, key: string): any {
    return this.getCurrentDepartureControl(index, group)?.get(key)?.value;
  }

  getSuggestedMeetingDetails(index: number, group: number): { point: string; maps: string } {
    const control = this.getCurrentDepartureControl(index, group);
    if (!control) return { point: '', maps: '' };

    const location = control.get('location')?.value;
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

    const matches = (this.weeklyHistory || [])
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

    const location = control.get('location')?.value;
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
    this.isSaved = false;
  }

  onToggleCardReceived(index: number, group: number, checked: boolean): void {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(
      departureGroupKey,
    ) as FormArray;
    const control = departureFormArrayItem?.at(index);
    if (!control) return;

    control.get('cardStatus')?.setValue(checked ? 'received' : 'pending');
    this.isSaved = false;
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
          this.isSaved = false;
          return true;
        }
      }
    }
    return false;
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
  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      verticalPosition: this.verticalPosition,
    });
  }
  get departureFormArray() {
    const departureGroupKey = `departure${this.numberGroup}`;
    if (!this.formDeparture.get(departureGroupKey)) {
      this.formDeparture.setControl(departureGroupKey, new FormArray([]));
    }
    return this.formDeparture.get(departureGroupKey) as FormArray;
  }
  filterControlsByGroup(group: number) {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(
      departureGroupKey,
    ) as FormArray;
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

  getDepartureTitle(dateStr: string, scheduleStr: string): string {
    if (!dateStr) return 'Salida sin fecha';
    
    // Parse date (add time to prevent timezone shifts)
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return 'Fecha inválida';

    const daysOfWeek = [
      'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
    ];
    const dayName = daysOfWeek[date.getDay()];

    let timeLabel = '';
    if (scheduleStr) {
      const [hoursStr] = scheduleStr.split(':');
      const hours = parseInt(hoursStr, 10);

      if (!isNaN(hours)) {
        if (hours < 12) {
          timeLabel = ' (mañana)';
        } else if (hours < 20) {
          timeLabel = ' (tarde)';
        } else {
          timeLabel = ' (noche)';
        }
      }
    }

    return `${dayName}${timeLabel}`;
  }
  onChangeInput(e: any, key: string, index: number, group: number) {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(
      departureGroupKey,
    ) as FormArray;
    const control = departureFormArrayItem.at(index);

    if (control) {
      if (key === 'location') {
        const territoryArray = control.get('territory') as FormArray;
        if (territoryArray) {
          territoryArray.clear();
        }
      }
      control.get(key)?.setValue(e.target.value);
    }
    this.isSaved = false;
  }
  onChangeColor(event: any, index: number, group: number) {
    this.isSaved = false;
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(
      departureGroupKey,
    ) as FormArray;
    const control = departureFormArrayItem.at(index);
    if (control) {
      control.get('color')?.setValue(event.target.value);
    }
  }
  onChangeCheckbox(e: any, key: string, index: number, group: number) {
    this.isSaved = false;
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(
      departureGroupKey,
    ) as FormArray;
    const control = departureFormArrayItem.at(index);
    if (control) {
      if (key === 'isEvent') {
        const checked = e.target.checked;
        control.get(key)?.setValue(checked);
        control.get('cardStatus')?.setValue(checked ? 'not_required' : 'pending');
        if (checked) {
          // Clear locations and territories if it's now an event
          const territoryArray = control.get('territory') as FormArray;
          if (territoryArray) {
            territoryArray.clear();
          }
        }
      } else {
        control.get(key)?.setValue(e.target.checked);
      }
    }
  }
  addInputForm(group: number) {
    this.isSaved = false;
    this.numberGroup = group;
    const defaultDate = this.dateDepartureInput();
    this.departureFormArray.push(
      this.fb.group({
        date: new FormControl(defaultDate),
        driver: new FormControl(''),
        schedule: new FormControl(''),
        location: new FormControl(this.territoryPrefix),
        territory: this.fb.array([]),
        point: new FormControl(''),
        maps: new FormControl(''),
        color: new FormControl('secondary'),
        group: new FormControl(group),
        isEvent: new FormControl(false),
        title: new FormControl(''),
        cardStatus: new FormControl('pending'),
      }),
    );
  }
  deleteInputForm(index: number, group: number) {
    this.isSaved = false;
    this.numberGroup = group;
    this.departureFormArray.removeAt(index);
    // Si el grupo queda vacío, eliminarlo de groupKeys SOLO si NO es el grupo 0 (Salidas Generales)
    // El grupo 0 siempre debe permanecer para que el botón "Nueva salida +" esté disponible
    if (this.departureFormArray.length === 0 && group !== 0) {
      this.groupKeys = this.groupKeys.filter((k) => k !== group);
    }
  }
  rollbackInputForm() {
    this.isSaved = false;
    this.groupKeys = [];
    this.groupedDepartures = {};

    // Limpiar todos los FormArrays existentes
    Object.keys(this.formDeparture.controls).forEach((key) => {
      if (key.startsWith('departure')) {
        (this.formDeparture.get(key) as FormArray).clear();
      }
    });

    const departures = this.formDepartureDataInput();
    departures.forEach((departure: any) => {
      const groupKey = Number(departure.group) || 0;

      if (!this.groupedDepartures[groupKey]) {
        this.groupKeys.push(groupKey);
        this.groupedDepartures[groupKey] = [];
      }

      const departureGroupKey = `departure${groupKey}`;
      if (!this.formDeparture.get(departureGroupKey)) {
        this.formDeparture.setControl(departureGroupKey, this.fb.array([]));
      }

      const departureFormArrayItem = this.formDeparture.get(
        departureGroupKey,
      ) as FormArray;

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
            departure.isEvent
              ? 'not_required'
              : departure.cardStatus || 'pending',
          ),
        }),
      );
    });

    this.groupKeys = [...new Set(this.groupKeys)].sort((a, b) => a - b);
  }
  addNewGroup() {
    this.isSaved = false;
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
    return (dayGroup.get('territory') as FormArray)?.value || [];
  }

  // Verifica si un territorio está seleccionado
  isTerritoryChecked(num: string, i: number, group: number): boolean {
    const current = this.getTerritoryArray(i, group).value;
    return current.includes(num);
  }

  // Agrega o quita un territorio
  toggleTerritory(num: string, i: number, group: number, isChecked: boolean) {
    const control = this.getTerritoryArray(i, group);
    const current = control.value as string[];

    if (isChecked && !current.includes(num)) {
      control.push(new FormControl(num));
    } else if (!isChecked) {
      const index = current.indexOf(num);
      if (index !== -1) control.removeAt(index);
    }
  }
  handleCheckboxChange(event: Event, num: string, i: number, group: number) {
    this.isSaved = false;
    const input = event.target as HTMLInputElement;
    const isChecked = input.checked;
    this.toggleTerritory(num, i, group, isChecked);
    this.syncMeetingDetails(i, group);
  }

  isDirty(): boolean {
    return this.formDeparture.dirty;
  }

  submitForm(): Departure[] {
    this.isSaved = true;

    const targetMondayStr = this.dateDepartureInput();
    const targetMonday = new Date(targetMondayStr + 'T00:00:00');
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    const formDepartures = this.groupKeys
      .map((number) => this.formDeparture.value?.[`departure${number}`])
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
      if (
        isNaN(date.getTime()) ||
        (date >= targetMonday && date <= targetSunday)
      ) {
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
      this.territoryDataService.postWeeklyDeparture(weeklyDeparture);
      weeklyOnly.splice(0, weeklyOnly.length, ...normalizedWeeklyOnly);
    }

    // Guardar las salidas que pertenecen a otras semanas en su semana correspondiente
    // Para cada semana distinta, hacemos un merge con lo que ya existe en Firestore
    Object.entries(otherWeeks).forEach(([otherWeekId, newDepartures]) => {
      this.territoryDataService
        .getWeeklyDeparture(otherWeekId)
        .pipe(take(1))
        .subscribe((existing) => {
          const existingDepartures = existing?.departure || [];
          // Combinar sin duplicar (evitar agregar si ya existe)
          const merged = [...existingDepartures];
          newDepartures.forEach((nd) => {
            const alreadyExists = existingDepartures.some(
              (ed: Departure) =>
                ed.date === nd.date &&
                ed.driver === nd.driver &&
                ed.schedule === nd.schedule,
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
          this.territoryDataService.postWeeklyDeparture(otherWeeklyDeparture);
        });
    });

    this._snackBar.open('✅ Semana y salidas guardadas correctamente', 'Ok', {
      verticalPosition: this.verticalPosition,
      duration: 3000,
    });

    // Re-inicializar el formulario mostrando solo las salidas de esta semana
    this.initForm(weeklyOnly);
    return weeklyOnly;
  }
}
