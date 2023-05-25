import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';

@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.component.html',
  styleUrls: ['./statistics-page.component.scss'],
})
export class StatisticsPageComponent implements OnInit{
  routerBreadcrum: any = [];
  loadingData: boolean = false;
  territoryPath: any;
  territory: TerritoryNumberData[] = [];
  dataListFull: any[] = [];
  dataStadistics: any[] = [];
  appleCount: any;
  path: any = '';
  order: any = 1;
  constructor(
    private territorieDataService: TerritoryDataService,
    private spinner: SpinnerService,
    private rutaActiva: ActivatedRoute,
  ) {
    this.territoryPath = this.rutaActiva.snapshot.url.join('/');;
  }

  ngOnInit(): void {
    this.getDataStatisticTerritory();
  }
  getDataStatisticTerritory(){
    let nameLocalStorage = this.territoryPath === "mariaTeresa" ? "statisticDataMT" : "statisticDataCH";
    if(!localStorage.getItem(nameLocalStorage)){
      if(!localStorage.getItem("numberTerritory")){
        this.spinner.cargarSpinner();
        this.territorieDataService.getNumberTerritory()
        .subscribe(number => {
          localStorage.setItem("numberTerritory", JSON.stringify(number[0]));
          this.territory = number[0][this.territoryPath];
          // RECIBIR LA DATA
          this.territory.map((territory) => {
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
                  const storeStatisticdData = localStorage.getItem(nameLocalStorage);
                  const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
                  statisticData.push(card);
                  localStorage.setItem(nameLocalStorage, JSON.stringify(statisticData));
                },
              });
            });
            this.sortTable("completed");
            this.loadingData = true;
          this.spinner.cerrarSpinner();
        });
      } else {
        const storedNumberTerritory = localStorage.getItem("numberTerritory");
        const numberTerritory = storedNumberTerritory ? JSON.parse(storedNumberTerritory) : [];
        this.territory = numberTerritory?.[this.territoryPath];
        this.territory.map((territory) => {
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
                const storeStatisticdData = localStorage.getItem(nameLocalStorage);
                const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
                statisticData.push(card);
                localStorage.setItem(nameLocalStorage, JSON.stringify(statisticData));
              },
            });
        });
        this.sortTable("completed");
        this.loadingData = true;
        this.spinner.cerrarSpinner();
      }
    } else {
      const storedStatisticData = localStorage.getItem(nameLocalStorage);
      const statisticData = storedStatisticData ? JSON.parse(storedStatisticData) : [];
      this.dataListFull = statisticData;
      this.loadingData = true;
    }
  }
  sortTable(prop: string) {
    this.path = prop;
    this.order = this.order * (-1);
    return false;
  }
  getIcon(prop:string): string{
    var iconClass = "fa fa-sort";
    if(this.path.indexOf(prop) != -1){
      iconClass = this.order===-1 ? 'fa fa-sort-down' : 'fa fa-sort-up';
    }
    return iconClass;
  }
}
