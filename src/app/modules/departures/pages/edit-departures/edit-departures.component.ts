import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DepartureData, Departure } from '@core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-edit-departures',
  templateUrl: './edit-departures.component.html',
  styleUrls: ['./edit-departures.component.scss']
})
export class EditDeparturesComponent implements OnInit{
  dataLoaded: boolean = false;
  routerBreadcrum: any = [];
  dateDeparture: any = new FormControl("");
  generalDeparture: any;
  groupDeparture: any;
  formDepartureData: Departure[] = {} as Departure[];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoryDataService: TerritoryDataService,
    private spinner: SpinnerService,
    private _snackBar: MatSnackBar,
  ){
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }
  ngOnInit(): void {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = this.routerBreadcrum[11];
    this.territoryDataService.getDateDepartures().subscribe({
      next: (date) => {
        this.dateDeparture.setValue(date.date);
        this.spinner.cerrarSpinner();
      }
    });
    this.territoryDataService.getDepartures().subscribe((departure: DepartureData) => {
      this.dataLoaded = true;
      this.formDepartureData = departure.departure;
    })
  }
  updateDate(){
    this._snackBar.open('Fecha actualizada', 'Ok');
    this.territoryDataService.putDate({date: this.dateDeparture.value});
  }
}
