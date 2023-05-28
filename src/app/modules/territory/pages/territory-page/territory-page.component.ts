import { Component, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { CardService } from '@core/services/card.service';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';

@Component({
  selector: 'app-territory-page',
  templateUrl: './territory-page.component.html',
  styleUrls: ['./territory-page.component.scss'],
})
export class TerritoryPageComponent implements OnInit {
  routerBreadcrum: any = [];
  territorioMaps: CardButtonsData[] = [];
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
    this.routerBreadcrum = this.routerBreadcrum[0];
    if(localStorage.getItem("tokenAdmin")){
      this.isAdmin = true;
    } else if(localStorage.getItem("tokenConductor")){
      this.isDriver = true;
    }
    if(!sessionStorage.getItem("territorioMaps")){
      this.spinner.cargarSpinner();
      this.territorieDataService.getMaps()
      .subscribe(map => {
        sessionStorage.setItem("territorioMaps", JSON.stringify(map[0].maps));
        this.territorioMaps = map[0].maps;
        this.spinner.cerrarSpinner();
      });
    } else {
      const storedTerritorioMaps = sessionStorage.getItem("territorioMaps");
      const storedNumberTerritory = sessionStorage.getItem("numberTerritory");
      const numberTerritory = storedNumberTerritory ? JSON.parse(storedNumberTerritory) : [];

      this.territorioMaps = storedTerritorioMaps ? JSON.parse(storedTerritorioMaps) : [];
      this.territoriesMT = numberTerritory.mariaTeresa;
      this.territoriesC = numberTerritory.christophersen;
    }
  }
}
