import { Component, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';


import { CardService } from '@core/services/card.service';
import { TerritoriesChristMockService } from '@shared/mocks/territories-christ-mock.service';
import { TerritoriesMTMockService } from '@shared/mocks/territories-mtmock.service';
import { TerritorioMapsMockService } from '@shared/mocks/territorio-maps-mock.service';

@Component({
  selector: 'app-territory-page',
  templateUrl: './territory-page.component.html',
  styleUrls: ['./territory-page.component.scss'],
})
export class TerritoryPageComponent implements OnInit {
  routerBreadcrum: any = [];
  territorioMaps: any = [];
  territoriesMT: any[] = [];
  territoriesC: any[] = [];

  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territorieDataService: TerritoryDataService,
    private territorioMapsMockService: TerritorioMapsMockService,
    private territoriesMTMockService: TerritoriesMTMockService,
    private territoriesChristMockService: TerritoriesChristMockService,
    public cardService: CardService
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.territorioMaps = territorioMapsMockService.getMaps();
    this.territoriesMT = territoriesMTMockService.getTerritories();
    this.territoriesC = territoriesChristMockService.getTerritories();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[0];
  }

  onProgress(card: any){
    if(card.name === "Rural"){
      alert("Próximamente estará disponible . . . 👨‍🔧👨‍🏭👨‍💻")
    }
  }
}
