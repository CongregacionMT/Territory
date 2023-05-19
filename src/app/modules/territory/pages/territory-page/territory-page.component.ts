import { Component, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { CardService } from '@core/services/card.service';
import { MapData } from '@core/models/MapData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';

@Component({
  selector: 'app-territory-page',
  templateUrl: './territory-page.component.html',
  styleUrls: ['./territory-page.component.scss'],
})
export class TerritoryPageComponent implements OnInit {
  routerBreadcrum: any = [];
  territorioMaps: MapData[] = [];
  territoriesMT: TerritoryNumberData[] = [];
  territoriesC: TerritoryNumberData[] = [];
  isAdmin: boolean = false;
  isDriver: boolean = false;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territorieDataService: TerritoryDataService,
    private spinner: SpinnerService,
    public cardService: CardService
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }

  ngOnInit(): void {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = this.routerBreadcrum[0];
    if(localStorage.getItem("tokenAdmin")){
      this.isAdmin = true;
    } else if(localStorage.getItem("tokenConductor")){
      this.isDriver = true;
    }
    this.territorieDataService.getMaps()
    .subscribe(map => {
      this.territorioMaps = map[0].maps;
      this.spinner.cerrarSpinner();
    });
    this.territorieDataService.getNumberTerritory()
    .subscribe(number => {
      this.territoriesMT = number[0].numberTerritory;
      this.territoriesC = number[0].numberTerritoryCH;
    });
  }
}
