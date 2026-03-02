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
  localities = environment.localities;
  territoryOptionsMap: { [key: string]: string[] } = {};
  isSaved: boolean = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
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
        }),
      );
    });

    // Asegurar que groupKeys esté ordenado y no tenga duplicados
    this.groupKeys = [...new Set(this.groupKeys)].sort((a, b) => a - b);
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
  }

  loadDrivers() {
    this.territoryDataService.getUsers().subscribe((users) => {
      this.drivers.set(users.sort((a, b) => a.user.localeCompare(b.user)));
    });
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
      }),
    );
  }
  deleteInputForm(index: number, group: number) {
    this.isSaved = false;
    this.numberGroup = group;
    this.departureFormArray.removeAt(index);
    // Si el grupo queda vacío, eliminarlo de groupKeys (sin renumerar)
    if (this.departureFormArray.length === 0) {
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
  }

  isDirty(): boolean {
    return this.formDeparture.dirty;
  }

  submitForm() {
    this.isSaved = true;

    const targetMondayStr = this.dateDepartureInput();
    const targetMonday = new Date(targetMondayStr + 'T00:00:00');
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    const formDepartures = this.groupKeys
      .map((number) => this.formDeparture.value?.[`departure${number}`])
      .flat();

    // Guardar SOLO en WeeklyDepartures/{weekId} — no tocar docDeparture.
    // docDeparture es solo la plantilla/template; mezclar fechas allí causa datos fantasma.
    // Filtramos solo las salidas que realmente pertenecen a esta semana.
    const weeklyOnly = formDepartures.filter((d: Departure) => {
      if (!d.date) return true;
      const date = new Date(d.date + 'T00:00:00');
      return date >= targetMonday && date <= targetSunday;
    });

    if (targetMondayStr) {
      const weeklyDeparture: WeeklyDeparture = {
        departure: weeklyOnly,
        weekId: targetMondayStr,
        createdAt: new Date(),
      };
      this.territoryDataService.postWeeklyDeparture(weeklyDeparture);
    }

    this._snackBar.open('✅ Semana y salidas guardadas correctamente', 'Ok', {
      verticalPosition: this.verticalPosition,
      duration: 3000,
    });

    // Re-inicializar el formulario para aplicar filtros visuales
    this.initForm(formDepartures);
  }
}
