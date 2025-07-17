import { Component, OnInit, inject } from '@angular/core';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { TerritoriesNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-home-statistics-page',
    templateUrl: './home-statistics-page.component.html',
    styleUrls: ['./home-statistics-page.component.scss'],
    imports: [BreadcrumbComponent, CardXlComponent, RouterLink]
})
export class HomeStatisticsPageComponent implements OnInit {
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  private readonly KEY_NAME_MT = 'statisticDataMT';
  private readonly KEY_NAME_CH = 'statisticDataCH';
  routerBreadcrum: any = [];
  CardButtonsStatistics: CardButtonsData[] = [];
  territoryNumberOfLocalStorage: TerritoriesNumberData =
    {} as TerritoriesNumberData;
  appleCount: any;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {}
  ngOnInit(): void {
    let timeElapsed = 0;
    this.spinner.cargarSpinner();
    const interval = setInterval(() => {
      if (
        sessionStorage.getItem(this.KEY_NAME_MT) &&
        sessionStorage.getItem(this.KEY_NAME_CH)
      ) {
        clearInterval(interval);
        this.spinner.cerrarSpinner();
      }
      timeElapsed += 1;
    }, 300);
    const storedTerritorioStatistics = sessionStorage.getItem(
      'territorioStatistics'
    );
    const numberTerritory = storedTerritorioStatistics
      ? JSON.parse(storedTerritorioStatistics)
      : [];
    this.CardButtonsStatistics = numberTerritory.territorio;
    if (
      !sessionStorage.getItem('statisticDataMT') ||
      !sessionStorage.getItem('statisticDataCH')
    ) {
      this.territoryNumberOfLocalStorage = JSON.parse(
        sessionStorage.getItem('numberTerritory') as string
      );

      this.territoryNumberOfLocalStorage.mariaTeresa.map((territory) => {
        this.territorieDataService
          .getCardTerritorie(territory.collection)
          .subscribe((card) => {
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
            const storeStatisticdData =
              sessionStorage.getItem('statisticDataMT');
            const statisticData = storeStatisticdData
              ? JSON.parse(storeStatisticdData)
              : [];
            statisticData.push(card);
            sessionStorage.setItem(
              'statisticDataMT',
              JSON.stringify(statisticData)
            );
          });
      });
      this.territoryNumberOfLocalStorage.christophersen.map((territory) => {
        this.territorieDataService
          .getCardTerritorie(territory.collection)
          .subscribe((card) => {
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
            const storeStatisticdData =
              sessionStorage.getItem('statisticDataCH');
            const statisticData = storeStatisticdData
              ? JSON.parse(storeStatisticdData)
              : [];
            statisticData.push(card);
            sessionStorage.setItem(
              'statisticDataCH',
              JSON.stringify(statisticData)
            );
          });
      });
    }
  }
}
