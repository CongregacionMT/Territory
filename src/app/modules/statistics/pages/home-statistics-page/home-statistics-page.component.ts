import { Component, OnInit, inject, signal } from '@angular/core';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { TerritoriesNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { RouterLink } from '@angular/router';
import { environment } from '@environments/environment';
import { LocalityData } from '@core/models/LocalityData';

@Component({
    selector: 'app-home-statistics-page',
    templateUrl: './home-statistics-page.component.html',
    styleUrls: ['./home-statistics-page.component.scss'],
    imports: [BreadcrumbComponent, CardXlComponent, RouterLink]
})
export class HomeStatisticsPageComponent implements OnInit {
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  routerBreadcrum = signal<any>([]);
  CardButtonsStatistics = signal<CardButtonsData[]>([]);
  territoryNumberOfLocalStorage = signal<TerritoriesNumberData>({} as TerritoriesNumberData);
  appleCount = signal<any>(null);
  congregationKey = environment.congregationKey;
  localities: any[] = environment.localities || [];

  constructor(...args: unknown[]);
  constructor() {}

  ngOnInit(): void {
    this.spinner.cargarSpinner();

    // Cargar botones de estadísticas (mapas)
    const storedTerritorioStatistics = sessionStorage.getItem('territorioStatistics');
    const numberTerritory = storedTerritorioStatistics
      ? JSON.parse(storedTerritorioStatistics)
      : [];
    
    // Usar los links directos de Firebase
    if (numberTerritory.territorio) {
      this.CardButtonsStatistics.set(numberTerritory.territorio);
    }

    // Cargar estadísticas para cada localidad
    this.territoryNumberOfLocalStorage.set(
      JSON.parse(sessionStorage.getItem('numberTerritory') as string)
    );

    const promises: Promise<void>[] = [];

    this.localities.forEach(locality => {
      if (locality.hasNumberedTerritories) {
        promises.push(this.loadStatisticsForLocality(locality));
      }
    });

    Promise.all(promises).then(() => {
      this.spinner.cerrarSpinner();
    });
  }

  async loadStatisticsForLocality(locality: any): Promise<void> {
    const storageKey = this.getStorageKeyForLocality(locality.key);
    
    if (sessionStorage.getItem(storageKey)) {
      return; // Ya cargado
    }

    const numberTerritory = this.territoryNumberOfLocalStorage();
    const localityTerritories = numberTerritory[locality.key] || [];

    if (localityTerritories.length === 0) return;

    const initialStatisticData: any[] = [];
    
    // Crear array de promesas para cargar datos de cada territorio
    const territoryPromises = localityTerritories.map((territory: any) => 
      new Promise<void>((resolve) => {
        this.territorieDataService
          .getCardTerritorie(territory.collection)
          .subscribe((card) => {
            // Filtrar manzanas vacías o sin check
            card.forEach((list: any, index: number) => {
              let count = 0;
              list.applesData.forEach((apple: any) => {
                if (apple.checked === true) {
                  count++;
                }
              });
              // Nota: la lógica original borraba el elemento si count era 0
              // pero splice en un forEach puede causar problemas de índice.
              // Aquí mantenemos la lógica original pero con cuidado.
              if (count === 0) {
                 // Marcamos para borrar o filtramos después. 
                 // Para mantener compatibilidad exacta con lógica anterior:
                 // card.splice(index, 1); <-- esto es peligroso en forEach
              }
            });
            
            // Filtrar listas vacías de forma segura
            const filteredCard = card.filter((list: any) => {
              const checkedCount = list.applesData.filter((a: any) => a.checked).length;
              return checkedCount > 0;
            });

            if (filteredCard.length > 0) {
              initialStatisticData.push(filteredCard);
            }
            resolve();
          });
      })
    );

    await Promise.all(territoryPromises);
    sessionStorage.setItem(storageKey, JSON.stringify(initialStatisticData));
  }
  
  getStorageKeyForLocality(localityKey: string): string {
    // Genera clave única para cada localidad: statisticDataMariaTeresa, statisticDataWheelwright
    const suffix = localityKey.charAt(0).toUpperCase() + localityKey.slice(1).replace(/-/g, '');
    return `statisticData${suffix}`;
  }
}
