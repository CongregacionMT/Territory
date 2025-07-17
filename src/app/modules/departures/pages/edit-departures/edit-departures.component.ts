import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DepartureData, Departure } from '@core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { FormEditDeparturesComponent } from '../../components/form-edit-departures/form-edit-departures.component';

@Component({
    selector: 'app-edit-departures',
    templateUrl: './edit-departures.component.html',
    styleUrls: ['./edit-departures.component.scss'],
    imports: [ReactiveFormsModule, FormEditDeparturesComponent]
})
export class EditDeparturesComponent implements OnInit{
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private _snackBar = inject(MatSnackBar);

  dataLoaded: boolean = false;
  routerBreadcrum: any = [];
  dateDeparture: any = new FormControl("");
  formDepartureData: Departure[] = {} as Departure[];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor(){
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

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
