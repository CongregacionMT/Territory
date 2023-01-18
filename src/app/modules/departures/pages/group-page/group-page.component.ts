import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { ActivatedRoute, Params } from '@angular/router';

@Component({
  selector: 'app-group-page',
  templateUrl: './group-page.component.html',
  styleUrls: ['./group-page.component.scss']
})
export class GroupPageComponent implements OnInit {
  routerBreadcrum: any = [];
  isAdmin: boolean = false;
  numberGroup: any;
  dateDeparture: any = new FormControl("");
  departures$: any = [];
  editDepartures: any = {};
  formDeparture: FormGroup;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoryDataService: TerritoryDataService,
    private fb: FormBuilder,
    private spinner: SpinnerService,
    private rutaActiva: ActivatedRoute,
  ){
    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    if(localStorage.getItem("tokenAdmin")){
      this.isAdmin = true;
    }
    this.formDeparture = this.fb.group({
      departure: new FormArray([])
    });
    this.numberGroup = this.rutaActiva.snapshot.params;
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[11];
    this.territoryDataService.getDepartures(this.numberGroup.number).subscribe({
      next: (departure) => {
        // Tabla de salidas
        this.departures$ = departure.departure;                
        // Datos para editar        
        this.editDepartures = JSON.parse(JSON.stringify(departure));
        this.departureFormArray.clear()        
        this.editDepartures.departure.map((departure: any, index: number) => {
          this.departureFormArray.push(this.fb.group({
            day: new FormControl(departure.day),
            driver: new FormControl(departure.driver),
            schedule: new FormControl(departure.schedule),
            territory: new FormControl(departure.territory),
            point: new FormControl(departure.point),
            checked: new FormControl(departure.checked),
          }));
        });
        this.territoryDataService.getDateDepartures().subscribe({
          next: (date) => {
            this.dateDeparture.setValue(date.date);
            this.spinner.cerrarSpinner();
          }
        });
      }
    })
  }
  onChangeInput(e:any, key: any, indexChange: any){
    this.departureFormArray.controls.forEach((item: any, indexArray: any) => {
      if(key === item.value.day && indexChange === indexArray){   
        item.value.day = e.target.value;       
      } else if(key === item.value.driver && indexChange === indexArray){
        item.value.driver = e.target.value;     
      } else if(key === item.value.schedule && indexChange === indexArray){
        item.value.schedule = e.target.value; 
      } else if(key === item.value.territory && indexChange === indexArray){
        item.value.territory = e.target.value; 
      } else if(key === item.value.point && indexChange === indexArray){
        item.value.point = e.target.value; 
      } else if(key === item.value.checked && indexChange === indexArray){
        item.value.checked = e.target.checked;
      }
    })
  }
  get departureFormArray() {
    return this.formDeparture.get('departure') as FormArray;
  }
  addInputForm(){
    this.departureFormArray.push(this.fb.group({
      day: new FormControl(''),
      driver: new FormControl(''),
      schedule: new FormControl(''),
      territory: new FormControl(''),
      point: new FormControl(''),
    }));
  }
  deleteInputForm(index: number){  
    this.departureFormArray.removeAt(index)
  }
  rollbackInputForm(){
    this.departureFormArray.clear()
    this.editDepartures.departure.map((departure: any, index: number) => {          
      this.departureFormArray.push(this.fb.group({
        day: new FormControl(departure.day),
        driver: new FormControl(departure.driver),
        schedule: new FormControl(departure.schedule),
        territory: new FormControl(departure.territory),
        point: new FormControl(departure.point),
        checked: new FormControl(departure.checked),
      }));
    });
  }
  submitForm(){
    this.territoryDataService.putDate({date: this.dateDeparture.value});
    this.territoryDataService.putDepartures(this.formDeparture.value, this.numberGroup.number);
  }
}
