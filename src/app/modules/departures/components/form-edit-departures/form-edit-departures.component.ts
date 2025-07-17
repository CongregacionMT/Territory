import { Component, OnInit, inject, input } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Departure } from '../../../../core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { MatSnackBar, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';

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

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor(){
    this.formDeparture = this.fb.group({
      departure0: new FormArray([])
    });
  }
  ngOnInit(): void {
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
        territory: new FormControl(departure.territory),
        point: new FormControl(departure.point),
        color: new FormControl(departure.color),
        group: new FormControl(departure.group),
      }));
    });
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
        } else if (key === 'territory') {
          item.get('territory')?.setValue(e.target.value);
        } else if (key === 'point') {
          item.get('point')?.setValue(e.target.value);
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
      territory: new FormControl(''),
      point: new FormControl(''),
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
        territory: new FormControl(departure.territory),
        point: new FormControl(departure.point),
        color: new FormControl(departure.color),
        group: new FormControl(departure.group),
      }));
    });
  }
  addNewGroup(){
    this.groupKeys.push(this.groupKeys.length);
    this.addInputForm(this.groupKeys.length - 1);
  }
  submitForm() {
    this.openSnackBar('Salidas actualizadas! 😉', 'ok');
    const departures = this.groupKeys.map(number => this.formDeparture.value?.[`departure${number}`]).flat();
    this.territoryDataService.putDepartures({ departure: departures });
  }
}
