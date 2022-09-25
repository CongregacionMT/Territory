import { Component, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { TerritoriesMTMockService } from '../../../../shared/mocks/territories-mtmock.service';
@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.component.html',
  styleUrls: ['./statistics-page.component.scss'],
})
export class StatisticsPageComponent implements OnInit {
  routerBreadcrum: any = [];
  territoriesMT: any[] = [];
  dataListFull: any[] = [];
  datalistFilter: any[] = [];
  dataStadistics: any[] = [];
  appleCount: any;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoriesMTMockService: TerritoriesMTMockService,
    private territorieDataService: TerritoryDataService
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[10];
    this.territoriesMT = this.territoriesMTMockService.getTerritories();
    // RECIBIR LA DATA
    this.territoriesMT.map((territory) => {
      this.territorieDataService
        .getCardTerritorie(territory.collection)
        .subscribe({
          next: (card) => {
            this.dataListFull.push(JSON.parse(JSON.stringify(card)));
            card.map((list: any, index: any) => {
              this.appleCount = 0;
              list.applesData.map((apple: any) => {
                if (apple.checked === true) {
                  this.appleCount += 1;
                }
              });
              if (this.appleCount === 0) {
                card.splice(index, 1);
              }
            });
            this.datalistFilter.push(JSON.parse(JSON.stringify(card)));
          },
        });
    });
    console.log('full: ', this.dataListFull);
    console.log('filter: ', this.datalistFilter);
  }
}
