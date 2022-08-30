import { Component, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { TerritoriesMTMockService } from '@shared/mocks/territories-mtmock.service';
@Component({
  selector: 'app-maria-teresa-assignment',
  templateUrl: './maria-teresa-assignment.component.html',
  styleUrls: ['./maria-teresa-assignment.component.scss'],
})
export class MariaTeresaAssignmentComponent implements OnInit {
  routerBreadcrum: any = [];
  territoriesMT: any[] = [];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoriesMTMockService: TerritoriesMTMockService,
    private territoryDataService: TerritoryDataService
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.territoriesMT = territoriesMTMockService.getTerritories();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[3];
  }

  pathMT(){
    this.territoryDataService.pathNumberTerritory = 0;
  }
}
