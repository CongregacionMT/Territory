import { Component, OnInit } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Departure, DepartureData } from '@core/models/Departures';

@Component({
  selector: 'app-home-departure-page',
  templateUrl: './home-departure-page.component.html',
  styleUrls: ['./home-departure-page.component.scss']
})
export class HomeDeparturePageComponent implements OnInit{
  isAdmin: boolean = false;
  routerBreadcrum: any = [];
  groupedDepartures: { [key: string]: Departure[] } = {};
  groupKeys: any[] = [];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoryDataService: TerritoryDataService,
    private spinner: SpinnerService,
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }
  ngOnInit(): void {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = this.routerBreadcrum[1];
    this.territoryDataService.getDepartures().subscribe((departures: DepartureData) => {
      departures.departure.map((dep) => {
        const groupKey = dep.group;
        if (!this.groupedDepartures[groupKey]) {
          this.groupKeys.push({
            name: `Grupo ${groupKey}`,
            src: '../../../assets/img/group.png',
            link: `grupo/${groupKey}`,
          });
          this.groupedDepartures[groupKey] = [];
        }
        this.groupedDepartures[groupKey].push(dep);
      });
      this.spinner.cerrarSpinner();
      this.groupKeys.shift();
    });
  }
}
