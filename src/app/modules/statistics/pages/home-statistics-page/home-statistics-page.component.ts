import { Component, OnInit } from '@angular/core';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { TerritoriesNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';

@Component({
  selector: 'app-home-statistics-page',
  templateUrl: './home-statistics-page.component.html',
  styleUrls: ['./home-statistics-page.component.scss']
})
export class HomeStatisticsPageComponent implements OnInit{
  routerBreadcrum: any = [];
  CardButtonsStatistics: CardButtonsData[] = [];
  territoryNumberOfLocalStorage: TerritoriesNumberData = {} as TerritoriesNumberData;
  appleCount: any;
  constructor(
    private territorieDataService: TerritoryDataService,
    private spinner: SpinnerService,
  ) {}
  ngOnInit(): void {
    if(!localStorage.getItem("territorioStatistics")){
      this.spinner.cargarSpinner();
      this.territorieDataService.getStatisticsButtons()
      .subscribe(number => {
        localStorage.setItem("territorioStatistics", JSON.stringify(number[0]));
        this.CardButtonsStatistics = number[0].territorio;
        this.spinner.cerrarSpinner();
      });
    } else {
      const storedTerritorioStatistics = localStorage.getItem("territorioStatistics");
      const numberTerritory = storedTerritorioStatistics ? JSON.parse(storedTerritorioStatistics) : [];
      this.CardButtonsStatistics = numberTerritory.territorio;
    }
    if(!localStorage.getItem("statisticDataMT") || !localStorage.getItem("statisticDataCH")){
      this.spinner.cargarSpinner();
      this.territoryNumberOfLocalStorage = JSON.parse(localStorage.getItem('numberTerritory') as string);
      this.territoryNumberOfLocalStorage.mariaTeresa.map((territory) => {
        this.territorieDataService.getCardTerritorie(territory.collection)
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
          const storeStatisticdData = localStorage.getItem('statisticDataMT');
          const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
          statisticData.push(card);
          localStorage.setItem('statisticDataMT', JSON.stringify(statisticData));
          this.spinner.cerrarSpinner();
        })
      });
      this.territoryNumberOfLocalStorage.christophersen.map((territory) => {
        this.territorieDataService.getCardTerritorie(territory.collection)
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
          const storeStatisticdData = localStorage.getItem('statisticDataCH');
          const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
          statisticData.push(card);
          localStorage.setItem('statisticDataCH', JSON.stringify(statisticData));
          this.spinner.cerrarSpinner();
        })
      });
    }
  }
}
