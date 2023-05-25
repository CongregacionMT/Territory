import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { forkJoin, tap } from 'rxjs';

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
  getDataStatisticTerritory() {
    const nameLocalStorage = this.territoryPath === "mariaTeresa" ? "statisticDataMT" : "statisticDataCH";

    if (localStorage.getItem(nameLocalStorage)) {
      const storedStatisticData = localStorage.getItem(nameLocalStorage);
      this.dataListFull = storedStatisticData ? JSON.parse(storedStatisticData) : [];
      this.loadingData = true;
      return;
    }

    const numberTerritory = localStorage.getItem("numberTerritory");
    const observables = numberTerritory
      ? this.territory.map((territory) =>
          this.territorieDataService.getCardTerritorie(territory.collection)
        )
      : [
          this.territorieDataService.getNumberTerritory().pipe(
            tap((number) => {
              localStorage.setItem("numberTerritory", JSON.stringify(number[0]));
              this.territory = number[0][this.territoryPath];
            })
          ),
          ...this.territory.map((territory) =>
            this.territorieDataService.getCardTerritorie(territory.collection)
          ),
        ];

    this.spinner.cargarSpinner();

    forkJoin(observables).subscribe((results) => {
      this.dataListFull = results.flat();
      this.dataListFull.forEach((card: any[]) => {
        card.forEach((list: any, index: number) => {
          const appleCount = list.applesData.reduce(
            (count: number, apple: any) => (apple.checked ? count + 1 : count),
            0
          );

          if (appleCount === 0) {
            card.splice(index, 1);
          }
        });
      });

      localStorage.setItem(nameLocalStorage, JSON.stringify(this.dataListFull));
      this.sortTable("completed");
      this.loadingData = true;
      this.spinner.cerrarSpinner();
    });
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
