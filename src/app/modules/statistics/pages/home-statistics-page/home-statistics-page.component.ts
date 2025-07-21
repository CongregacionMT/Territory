import { Component, OnInit, inject, signal } from '@angular/core';
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

  private readonly KEY_NAME_W = 'statisticDataW';
  private readonly KEY_NAME_R = 'statisticDataR';

  routerBreadcrum = signal<any>([]);
  CardButtonsStatistics = signal<CardButtonsData[]>([]);
  territoryNumberOfLocalStorage = signal<TerritoriesNumberData>({} as TerritoriesNumberData);
  appleCount = signal<any>(null);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {}
  ngOnInit(): void {
    let timeElapsed = 0;
    this.spinner.cargarSpinner();
    const interval = setInterval(() => {
      if (
        sessionStorage.getItem(this.KEY_NAME_W) &&
        sessionStorage.getItem(this.KEY_NAME_R)
      ) {
        clearInterval(interval);
        this.spinner.cerrarSpinner();
      }
      timeElapsed += 1;
    }, 300);
    const storedTerritorioStatistics = sessionStorage.getItem('territorioStatistics');
    const numberTerritory = storedTerritorioStatistics
      ? JSON.parse(storedTerritorioStatistics)
      : [];
    this.CardButtonsStatistics.set(numberTerritory.territorio);
    if (
      !sessionStorage.getItem(this.KEY_NAME_W) ||
      !sessionStorage.getItem(this.KEY_NAME_R)
    ) {
      this.territoryNumberOfLocalStorage.set(
        JSON.parse(sessionStorage.getItem('numberTerritory') as string)
      );

      // Inicializar el array de estadísticas una sola vez
      const initialStatisticData: any[] = [];
      let processedTerritories = 0;
      const totalTerritories = this.territoryNumberOfLocalStorage().wheelwright.length;
      this.territoryNumberOfLocalStorage().wheelwright.map((territory) => {
        this.territorieDataService
          .getCardTerritorie(territory.collection)
          .subscribe((card) => {
            card.map((list: any, index: any) => {
              this.appleCount.set(0);
              list.applesData.map((apple: any) => {
                if (apple.checked === true) {
                  this.appleCount.set(this.appleCount() + 1);
                }
              });
              if (this.appleCount() === 0) {
                card.splice(index, 1);
              }
            });

            // Agregar el card al array temporal
            initialStatisticData.push(card);
            processedTerritories++;

            // Cuando se hayan procesado todos los territorios, guardar una sola vez
            if (processedTerritories === totalTerritories) {
              sessionStorage.setItem(this.KEY_NAME_W, JSON.stringify(initialStatisticData));
            }
          });
      });
      this.spinner.cerrarSpinner();
    }
  }
}
  // Método para obtener las estadísticas de la predicación rural}
      // Proximamente estadisticas de la predicación rural
      // this.territoryNumberOfLocalStorage().rural.map((territory) => {
      //   this.territorieDataService
      //     .getCardTerritorie(territory.collection)
      //     .subscribe((card) => {
      //       card.map((list: any, index: any) => {
      //         this.appleCount.set(0);
      //         list.applesData.map((apple: any) => {
      //           if (apple.checked === true) {
      //             this.appleCount.set(this.appleCount() + 1);
      //           }
      //         });
      //         if (this.appleCount() === 0) {
      //           card.splice(index, 1);
      //         }
      //       });
      //       const storeStatisticdData = sessionStorage.getItem(this.KEY_NAME_R);
      //       const statisticData = storeStatisticdData
      //         ? JSON.parse(storeStatisticdData)
      //         : [];
      //       statisticData.push(card);
      //       sessionStorage.setItem(this.KEY_NAME_R, JSON.stringify(statisticData));
      //     });
      // });
