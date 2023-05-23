import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-departure-page',
  templateUrl: './departure-page.component.html',
  styleUrls: ['./departure-page.component.scss']
})
export class DeparturePageComponent implements OnInit {
  routerBreadcrum: any = [];
  numberGroup: any;
  dateDeparture: any = new FormControl("");
  departures$: any = [];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoryDataService: TerritoryDataService,
    private fb: FormBuilder,
    private spinner: SpinnerService,
    private rutaActiva: ActivatedRoute,
  ){
    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.numberGroup = this.rutaActiva.snapshot.params;
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[11];
    this.territoryDataService.getDepartures().subscribe({
      next: (departure) => {
        // Tabla de salidas
        this.departures$ = departure.departure;
        this.territoryDataService.getDateDepartures().subscribe({
          next: (date) => {
            this.dateDeparture.setValue(date.date);
            this.spinner.cerrarSpinner();
          }
        });
      }
    })
  }
}
