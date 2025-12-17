import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DateDeparture, Departure, DepartureData } from '@core/models/Departures';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { DeparturesCardsComponent } from '../../../../shared/components/departures-cards/departures-cards.component';

@Component({
    selector: 'app-departure-page',
    templateUrl: './departure-page.component.html',
    styleUrls: ['./departure-page.component.scss'],
    imports: [BreadcrumbComponent, DeparturesCardsComponent, RouterLink]
})
export class DeparturePageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private fb = inject(FormBuilder);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);

  routerBreadcrum: any = [];
  numberGroup: any = "0";
  titleGroup: string = "";
  dateDeparture: any = new FormControl("");
  departures$: Departure[] = [];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor(){
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.numberGroup = this.rutaActiva.snapshot.params;
    this.titleGroup = this.numberGroup.number !== "0" ? `(Grupo ${this.numberGroup.number})` : "";
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[10];
    this.territoryDataService.getDepartures().subscribe({
      next: (departure: DepartureData) => {
        // Cards de salidas
        this.departures$ = departure.departure;
        this.departures$.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        this.territoryDataService.getDateDepartures().subscribe({
          next: (date: DateDeparture) => {
            this.dateDeparture.setValue(date.date);
            this.spinner.cerrarSpinner();
          }
        });
      }
    })
  }
}
