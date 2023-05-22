import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Departure } from '../../../../core/models/Departures';

@Component({
  selector: 'app-form-edit-departures',
  templateUrl: './form-edit-departures.component.html',
  styleUrls: ['./form-edit-departures.component.scss']
})
export class FormEditDeparturesComponent implements OnInit{
  numberGroup: number = 0;
  formDeparture: FormGroup;
  selectedColor: string = 'primary';
  groupKeys: number[] = [];
  groupedDepartures: { [key: string]: Departure[] } = {};
  @Input() formDepartureDataInput: Departure[] = [] as Departure[];
  constructor(
    private territoryDataService: TerritoryDataService,
    private fb: FormBuilder,
  ){
    this.formDeparture = this.fb.group({
      departure0: new FormArray([])
    });
  }
  ngOnInit(): void {
    this.departureFormArray.clear()
    this.formDepartureDataInput.forEach((departure: Departure) => {
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
        territory: new FormControl(departure.territory),
        point: new FormControl(departure.point),
        color: new FormControl(departure.color),
        group: new FormControl(departure.group),
      }));
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
  onChangeInput(e: any, key: any, indexChange: any) {
    this.departureFormArray.controls.forEach((item: any, indexArray: any) => {
      const itemValue = item.getRawValue(); // Obtener el valor del FormGroup
      if (key === itemValue.date && indexChange === indexArray) {
        item.get('date').setValue(e.target.value);
      } else if (key === itemValue.driver && indexChange === indexArray) {
        item.get('driver').setValue(e.target.value);
      } else if (key === itemValue.schedule && indexChange === indexArray) {
        item.get('schedule').setValue(e.target.value);
      } else if (key === itemValue.territory && indexChange === indexArray) {
        item.get('territory').setValue(e.target.value);
      } else if (key === itemValue.point && indexChange === indexArray) {
        item.get('point').setValue(e.target.value);
      } else if (key === itemValue.checked && indexChange === indexArray) {
        item.get('checked').setValue(e.target.checked);
      }
    });
  }
  onChangeColor(event: any, index: number) {
    const departureControl = this.departureFormArray.controls[index];
    const selectedValue = event.target.value;
    departureControl.get('color')?.setValue(selectedValue);
  }
  addInputForm(group: number){
    this.departureFormArray.push(this.fb.group({
      date: new FormControl(''),
      driver: new FormControl(''),
      schedule: new FormControl(''),
      territory: new FormControl(''),
      point: new FormControl(''),
      color: new FormControl(''),
      group: new FormControl(''),
    }));
  }
  deleteInputForm(index: number){
    this.departureFormArray.removeAt(index)
  }
  rollbackInputForm(){
    this.departureFormArray.clear()
    this.formDepartureDataInput.map((departure: any, index: number) => {
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
  submitForm(group: number){
    this.territoryDataService.putDepartures(this.formDeparture.value, group);
  }
}
