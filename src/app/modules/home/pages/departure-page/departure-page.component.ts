import { Component, } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, FormArray } from '@angular/forms';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '../../../../core/services/spinner.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-departure-page',
  templateUrl: './departure-page.component.html',
  styleUrls: ['./departure-page.component.scss']
})
export class DeparturePageComponent {
  routerBreadcrum: any = [];
  isAdmin: boolean = false;
  departures: any[] = [
    {
      date: ""
    },
    {
      departures: []
    }
  ];
  editDepartures: any[] = [];
  formDeparture: FormGroup;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoryDataService: TerritoryDataService,
    private fb: FormBuilder,
    private spinner: SpinnerService
  ) {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    if(localStorage.getItem("tokenAdmin")){
      this.isAdmin = true;
    }
    this.formDeparture = this.fb.group({
      date: new FormControl(""),
      departure: new FormArray([])
    });
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[1];
    this.territoryDataService.getDepartures().subscribe({
      next: (departure) => {
        // Tabla de salidas
        this.departures = departure;
        // Datos para editar
        this.editDepartures = JSON.parse(JSON.stringify(departure));
        this.formDeparture.patchValue({date: this.editDepartures[0].date});
        this.departureFormArray.clear()
        this.editDepartures[0].departure.map((departure: any, index: number) => {          
          this.departureFormArray.push(this.fb.group({
            day: new FormControl(departure.day),
            driver: new FormControl(departure.driver),
            schedule: new FormControl(departure.schedule),
            territory: new FormControl(departure.territory),
            point: new FormControl(departure.point),
          }));
        });
        this.spinner.cerrarSpinner();
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
    this.editDepartures[0].departure.map((departure: any, index: number) => {          
      this.departureFormArray.push(this.fb.group({
        day: new FormControl(departure.day),
        driver: new FormControl(departure.driver),
        schedule: new FormControl(departure.schedule),
        territory: new FormControl(departure.territory),
        point: new FormControl(departure.point),
      }));
    });
  }
  submitForm(){
    this.territoryDataService.putDepartures(this.formDeparture.value);
  }
}
