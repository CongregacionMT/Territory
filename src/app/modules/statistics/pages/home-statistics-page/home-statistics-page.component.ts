import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { TerritoriesNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { Card, CardApplesData } from '@core/models/Card';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { RouterLink } from '@angular/router';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-home-statistics-page',
  templateUrl: './home-statistics-page.component.html',
  styleUrls: ['./home-statistics-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardXlComponent, RouterLink],
  standalone: true,
})
export class HomeStatisticsPageComponent implements OnInit {
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  CardButtonsStatistics = signal<CardButtonsData[]>([]);
  territoryNumberOfLocalStorage = signal<TerritoriesNumberData>({});

  localities = environment.localities || [];

  async ngOnInit(): Promise<void> {
    this.spinner.cargarSpinner();

    // Cargar botones de estadísticas (mapas)
    const storedTerritorioStatistics = sessionStorage.getItem('territorioStatistics');
    const numberTerritory = storedTerritorioStatistics
      ? (JSON.parse(storedTerritorioStatistics) as { territorio?: CardButtonsData[] })
      : { territorio: [] };

    if (numberTerritory.territorio) {
      this.CardButtonsStatistics.set(numberTerritory.territorio);
    }

    // Cargar estadísticas para cada localidad
    const territoryData = sessionStorage.getItem('numberTerritory');
    this.territoryNumberOfLocalStorage.set(
      territoryData ? (JSON.parse(territoryData) as TerritoriesNumberData) : {},
    );

    const promises: Promise<void>[] = [];

    this.localities.forEach((locality) => {
      if (locality.hasNumberedTerritories) {
        promises.push(this.loadStatisticsForLocality(locality));
      }
    });

    await Promise.all(promises);
    this.spinner.cerrarSpinner();
  }

  async loadStatisticsForLocality(locality: {
    name: string;
    key: string;
    territoryPrefix: string;
    storageKey: string;
    hasMap?: boolean;
    hasPreaching?: boolean;
  }): Promise<void> {
    const storageKey = this.getStorageKeyForLocality(locality.key);

    if (sessionStorage.getItem(storageKey)) {
      return;
    }

    const numberTerritory = this.territoryNumberOfLocalStorage();
    const localityTerritories = numberTerritory[locality.key] || [];

    if (localityTerritories.length === 0) return;

    const initialStatisticData: Card[][] = [];

    const territoryPromises = localityTerritories.map(async (territory: TerritoryNumberData) => {
      try {
        const card = await firstValueFrom(
          this.territorieDataService.getCardTerritorie(territory.collection),
        );

        // Filtrar listas vacías de forma segura
        const filteredCard = card.filter((list: Card) => {
          const checkedCount = (list.applesData || []).filter(
            (a: CardApplesData) => a.checked,
          ).length;
          return checkedCount > 0;
        });

        if (filteredCard.length > 0) {
          initialStatisticData.push(filteredCard);
        }
      } catch (error) {
        console.error(`Error loading territory ${territory.collection}`, error);
      }
    });

    await Promise.all(territoryPromises);
    sessionStorage.setItem(storageKey, JSON.stringify(initialStatisticData));
  }

  getStorageKeyForLocality(localityKey: string): string {
    const suffix = localityKey.charAt(0).toUpperCase() + localityKey.slice(1).replace(/-/g, '');
    return `statisticData${suffix}_12`;
  }
}
