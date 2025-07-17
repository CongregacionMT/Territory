import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { ActivatedRoute } from '@angular/router';
import { Departure, DepartureData } from '@core/models/Departures';

@Component({
    selector: 'app-departure-page',
    templateUrl: './departure-page.component.html',
    styleUrls: ['./departure-page.component.scss'],
    standalone: false
})
export class DeparturePageComponent implements OnInit {
  routerBreadcrum: any = [];
  numberGroup: any = "0";
  titleGroup: string = "";
  dateDeparture: any = new FormControl("");
  departures$: Departure[] = [];
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
    this.titleGroup = this.numberGroup.number !== "0" ? `(Grupo ${this.numberGroup.number})` : "";
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[11];
    this.territoryDataService.getDepartures().subscribe({
      next: (departure: DepartureData) => {
        // Tabla de salidas
        this.departures$ = departure.departure;
        this.departures$.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
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
}
