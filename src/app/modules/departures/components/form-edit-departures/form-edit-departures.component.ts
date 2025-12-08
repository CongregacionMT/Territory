import { Component, OnInit, inject, input } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Departure } from '../../../../core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { MatSnackBar, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { TERRITORY_COUNT } from '@shared/utils/territories.config';
import { environment } from '@environments/environment';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';

@Component({
    selector: 'app-form-edit-departures',
    templateUrl: './form-edit-departures.component.html',
    styleUrls: ['./form-edit-departures.component.scss'],
    imports: [ReactiveFormsModule]
})
export class FormEditDeparturesComponent implements OnInit{
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
  congregationName = environment.congregationName;
  territoryPrefix = environment.territoryPrefix;
  localities = environment.localities;
  territoryOptionsMap: { [key: string]: string[] } = {};

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor(){
    this.formDeparture = this.fb.group({
      departure0: new FormArray([])
    });
  }
  ngOnInit(): void {
    this.loadTerritoryData();
    this.departureFormArray.clear()
    this.formDepartureDataInput().forEach((departure: Departure) => {
      const groupKey = departure.group;
      if (!this.groupedDepartures[groupKey]) {
        this.groupKeys.push(groupKey);
        this.groupedDepartures[groupKey] = [];
      }
      this.groupedDepartures[groupKey].push(departure);
      this.numberGroup = departure.group;
      this.departureFormArray.push(this.fb.group({
        date: new FormControl(departure.date),
        driver: new FormControl(departure.driver),
        schedule: new FormControl(departure.schedule),
        location: new FormControl(departure.location),
        territory: this.fb.array(
          (departure.territory || []).map((t: string) => new FormControl(t))
        ),
        point: new FormControl(departure.point),
        maps: new FormControl(departure.maps),
        color: new FormControl(departure.color),
        group: new FormControl(departure.group),
      }));
    });
  }
  loadTerritoryData() {
    const stored = sessionStorage.getItem('numberTerritory');
    if (stored) {
      this.processTerritoryData(JSON.parse(stored));
    } else {
      this.territoryDataService.getNumberTerritory().subscribe((numbers: TerritoryNumberData[]) => {
        const mergedData = numbers.reduce((acc: any, curr: any) => {
          return { ...acc, ...curr };
        }, {});
        sessionStorage.setItem('numberTerritory', JSON.stringify(mergedData));
        this.processTerritoryData(mergedData);
      });
    }
  }

  processTerritoryData(data: any) {
    this.localities.forEach(loc => {
      if (loc.hasNumberedTerritories) {
        // data[loc.key] is an array of TerritoryNumberData objects or numbers
        const rawData = data[loc.key] || [];
        
        // Extract territory numbers, handling both object and number formats
        const numbers = rawData.map((item: any) => {
          // If it's an object with 'territorio' property, extract it
          if (typeof item === 'object' && item !== null && 'territorio' in item) {
            return item.territorio;
          }
          // Otherwise assume it's already a number
          return item;
        }).filter((n: any) => typeof n === 'number' || !isNaN(Number(n)));
        
        // Sort numerically
        const sorted = numbers.sort((a: number, b: number) => Number(a) - Number(b));
        this.territoryOptionsMap[loc.territoryPrefix] = sorted.map((n: number) => `N°${n}`);
      } else {
        // For Rural or others without numbered territories
        this.territoryOptionsMap[loc.territoryPrefix] = ['Rural'];
      }
    });

    // Fallback if current environment prefix not mapped
    if (!this.territoryOptionsMap[this.territoryPrefix] && (!data || Object.keys(data).length === 0)) {
       this.territoryOptionsMap[this.territoryPrefix] = Array.from({ length: TERRITORY_COUNT }, (_, i) => `N°${i + 1}`);
    }
    // Also ensure 'Rural' option is available if key 'rural' exists in localities
    // (Already handled by loop if configured in env, but checking just in case)
  }

  getTerritoryList(locationPrefix: string): string[] {
    if (!locationPrefix || locationPrefix === 'Seleccionar localidad') return [];
    // If exact match found
    if (this.territoryOptionsMap[locationPrefix]) return this.territoryOptionsMap[locationPrefix];
    
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
    this.numberGroup = group;
    const departureGroupKey = `departure${this.numberGroup}`;
    let departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray;
    let result = departureFormArrayItem.controls.filter((control) => {
      return control.get('group')?.value === group;
    });
    return result;
  }
  getGroupTitle(group: number | 'generales'): string {
    if (group === 0) {
      return 'Salidas Generales';
    } else {
      return 'Grupo ' + group;
    }
  }
  onChangeInput(e: any, key: any, indexChange: any, group: number) {
    const departureGroupKey = `departure${group}`;
    const departureFormArrayItem = this.formDeparture.get(departureGroupKey) as FormArray;
    const controls = departureFormArrayItem.controls;
    this.numberGroup = group;
    controls.forEach((item: AbstractControl<any, any>, index: number) => {
      if (index === indexChange) {
        if (key === 'date') {
          item.get('date')?.setValue(e.target.value);
        } else if (key === 'driver') {
          item.get('driver')?.setValue(e.target.value);
        } else if (key === 'schedule') {
          item.get('schedule')?.setValue(e.target.value);
        } else if (key === 'location') {
          item.get('location')?.setValue(e.target.value);
          const territoryArray = item.get('territory') as FormArray;
          if (territoryArray) {
             territoryArray.clear();
          }
        } else if (key === 'territory') {
          item.get('territory')?.setValue(e.target.value);
        } else if (key === 'point') {
          item.get('point')?.setValue(e.target.value);
        } else if (key === 'maps') {
          item.get('maps')?.setValue(e.target.value);
        } else if (key === 'color') {
          item.get('color')?.setValue(e.target.value);
        } else if (key === 'group') {
          item.get('group')?.setValue(e.target.value);
        }
      }
    });
  }
  onChangeColor(event: any, index: number, group: number) {
    this.numberGroup = group;
    const departureControl = this.departureFormArray.controls[index];
    const selectedValue = event.target.value;
    departureControl.get('color')?.setValue(selectedValue);
  }
  addInputForm(group: number){
    this.numberGroup = group;
    this.departureFormArray.push(this.fb.group({
      date: new FormControl(''),
      driver: new FormControl(''),
      schedule: new FormControl(''),
      location: new FormControl(this.territoryPrefix),
      territory: this.fb.array([]),
      point: new FormControl(''),
      maps: new FormControl(''),
      color: new FormControl('secondary'),
      group: new FormControl(group),
    }));
  }
  deleteInputForm(index: number, group: number){
    this.numberGroup = group;
    this.departureFormArray.removeAt(index);
    if(this.departureFormArray.length === 0){
      const indexToRemove = this.groupKeys.indexOf(this.numberGroup);
      if (indexToRemove !== -1) {
        this.groupKeys.splice(indexToRemove, 1);
        for (let i = indexToRemove; i < this.groupKeys.length; i++) {
          this.groupKeys[i] = this.groupKeys[i] - 1;
        }
      }
    }
  }
  rollbackInputForm(){
    this.departureFormArray.clear();
    this.formDepartureDataInput().map((departure: any, index: number) => {
      this.departureFormArray.push(this.fb.group({
        date: new FormControl(departure.day),
        driver: new FormControl(departure.driver),
        schedule: new FormControl(departure.schedule),
        location: new FormControl(departure.location),
        territory: new FormControl(departure.territory),
        point: new FormControl(departure.point),
        maps: new FormControl(departure.maps),
        color: new FormControl(departure.color),
        group: new FormControl(departure.group),
      }));
    });
  }
  addNewGroup(){
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
    const input = event.target as HTMLInputElement;
    const isChecked = input.checked;
    this.toggleTerritory(num, i, group, isChecked);
  }

  submitForm() {
    this.openSnackBar('Salidas actualizadas! 😉', 'ok');
    const departures = this.groupKeys.map(number => this.formDeparture.value?.[`departure${number}`]).flat();
    this.territoryDataService.putDepartures({ departure: departures });
  }
}
