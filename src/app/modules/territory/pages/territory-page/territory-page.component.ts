import { Component, OnInit, inject } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { CardService } from '@core/services/card.service';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { RouterLink } from '@angular/router';
import { CardSComponent } from '../../../../shared/components/card-s/card-s.component';

@Component({
    selector: 'app-territory-page',
    templateUrl: './territory-page.component.html',
    styleUrls: ['./territory-page.component.scss'],
    imports: [BreadcrumbComponent, CardXlComponent, RouterLink, CardSComponent]
})
export class TerritoryPageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  cardService = inject(CardService);

  routerBreadcrum: any = [];
  territorioMaps: CardButtonsData[] = [];
  territoriesW: TerritoryNumberData[] = [];
  isAdmin: boolean = false;
  isDriver: boolean = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

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
      this.territorioMaps = storedTerritorioMaps ? JSON.parse(storedTerritorioMaps) : [];
    }

    const storedNumberTerritory = sessionStorage.getItem("numberTerritory");
    const numberTerritory = storedNumberTerritory ? JSON.parse(storedNumberTerritory) : [];

    this.territoriesW = numberTerritory.wheelwright;
  }
}
