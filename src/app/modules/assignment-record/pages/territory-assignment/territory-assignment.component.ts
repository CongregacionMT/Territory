import { Component, OnInit, DOCUMENT, inject, signal } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { HttpClient } from '@angular/common/http';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin, take } from 'rxjs';

import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardSComponent } from '../../../../shared/components/card-s/card-s.component';
import { DatePipe } from '@angular/common';
import { environment } from '@environments/environment';
import { PdfService } from '@core/services/pdf.service';

import { Card, CardApplesData } from '@core/models/Card';
import { BreadcrumbItem } from '@core/models/Breadcrumb';

@Component({
  selector: 'app-territory-assignment',
  templateUrl: './territory-assignment.component.html',
  styleUrls: ['./territory-assignment.component.scss'],
  imports: [BreadcrumbComponent, ReactiveFormsModule, FormsModule, DatePipe],
})
export class TerritoryAssignmentComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private territorieDataService = inject(TerritoryDataService);
  private http = inject(HttpClient);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);
  private document = inject<Document>(DOCUMENT);
  private pdfService = inject(PdfService);

  routerBreadcrum = signal<BreadcrumbItem[]>([]);
  territoryPath = signal<string>('');
  territoriesNumber = signal<TerritoryNumberData[]>([]);
  dataListFull = signal<Card[][]>([]);
  filterDataListFull = signal<Card[][]>([]);
  selectedValueFilter = signal<string>('1');
  appleCount = signal<number>(0);
  s13JPG = signal<ArrayBuffer | null>(null);
  loadingData = signal(false);
  territoryNumberOfLocalStorage = signal<any>({});
  congregationKey = environment.congregationKey;

  constructor(...args: unknown[]);
  constructor() {
    this.territoryPath.set(this.rutaActiva.snapshot.url.join('/'));
    const breadcrumData = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum.set(breadcrumData[3]);
  }

  private getTerritoryPrefix(path: string): string {
    const locality = environment.localities.find((loc) => loc.key === path);
    return locality?.territoryPrefix || 'TerritorioMT';
  }

  private getStorageKeyByPath(path: string): string {
    const locality = environment.localities.find((loc) => loc.key === path);
    return locality?.storageKey || 'registerStatisticDataTerritorioMT';
  }

  ngOnInit(): void {
    const storedNumberTerritory = sessionStorage.getItem('numberTerritory');
    const numberTerritory = storedNumberTerritory
      ? JSON.parse(storedNumberTerritory)
      : [];

    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);

    this.territoriesNumber.set(numberTerritory[currentPath] || []);

    const storedStatisticData = sessionStorage.getItem(storageKey);
    if (storedStatisticData) {
      const parsedData = JSON.parse(storedStatisticData);
      this.dataListFull.set(parsedData);
      // Solo cargar datos si el array no está vacío o tiene la longitud correcta
      if (parsedData.length > 0) {
        this.sortByDate(this.selectedValueFilter());
        this.loadingData.set(true);
      } else {
        this.fetchDataForLocality(currentPath, storageKey, true);
      }
    } else {
      this.fetchDataForLocality(currentPath, storageKey, true);
    }

    this.loadPDFImage();
    this.preCacheOtherLocalitiesIfNeeded();
  }

  private loadPDFImage(): void {
    const httpOptions = {
      responseType: 'arraybuffer' as 'arraybuffer',
    };
    const jpgPath =
      this.document.location.origin + '/assets/documents/S-13_S_image.jpg';

    this.http.get(jpgPath, httpOptions).subscribe({
      next: (jpg) => this.s13JPG.set(jpg),
    });
  }

  private fetchDataForLocality(
    path: string,
    storageKey: string,
    updateState: boolean,
  ): void {
    if (updateState) {
      this.spinner.cargarSpinner();
    }

    const storedNumberTerritory = sessionStorage.getItem('numberTerritory');
    if (!storedNumberTerritory) {
      if (updateState) {
        this.spinner.cerrarSpinner();
      }
      return;
    }

    const territoryData = JSON.parse(storedNumberTerritory);
    const territories = territoryData[path] || [];

    const requests = territories.map((territory: any) =>
      this.territorieDataService
        .getCardTerritorieRegisterTable(territory.collection)
        .pipe(take(1)),
    );

    if (requests.length === 0) {
      if (updateState) {
        this.spinner.cerrarSpinner();
      }
      return;
    }

    forkJoin(requests).subscribe({
      next: (results: any) => {
        // Mantenemos la estructura original de 'results' para que los índices correspondan
        // a 'territoriesNumber'. Filtramos individualmente cada lista de tarjetas.
        const filteredResults = results.map((cardList: Card[]) => {
          if (!cardList) return [];
          return cardList.filter((card) => {
            let checkedAppleCount = 0;
            if (card.applesData) {
              checkedAppleCount = card.applesData.filter(
                (apple) => apple.checked,
              ).length;
            }
            // Solo incluimos tarjetas que tengan al menos una manzana marcada (completada/en progreso)
            return checkedAppleCount > 0;
          });
        });

        sessionStorage.setItem(storageKey, JSON.stringify(filteredResults));

        if (updateState) {
          this.dataListFull.set(filteredResults);
          this.sortByDate(this.selectedValueFilter());
          this.spinner.cerrarSpinner();
          this.loadingData.set(true);
        }
      },
      error: (err) => {
        console.error('Error fetching territory data:', err);
        if (updateState) {
          this.spinner.cerrarSpinner();
        }
      },
    });
  }

  refreshData(): void {
    this.spinner.cargarSpinner();
    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);

    // Limpiamos absolutamente todo lo relacionado con la caché de datos para forzar carga fresca
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem('numberTerritory');

    this.dataListFull.set([]);
    this.filterDataListFull.set([]);

    // Primero refrescamos el mapeo de territorios (números y colecciones)
    this.territorieDataService.getNumberTerritory().subscribe({
      next: (numbers: TerritoryNumberData[]) => {
        const mergedData = numbers.reduce((acc: any, curr: any) => {
          return { ...acc, ...curr };
        }, {});
        sessionStorage.setItem('numberTerritory', JSON.stringify(mergedData));

        // Actualizamos la lista de números localmente
        this.territoriesNumber.set(mergedData[currentPath] || []);

        // Ahora pedimos los datos específicos de las colecciones actualizadas
        this.fetchDataForLocality(currentPath, storageKey, true);
      },
      error: (err) => {
        console.error('Error refreshing territory mapping:', err);
        this.spinner.cerrarSpinner();
      },
    });
  }

  private preCacheOtherLocalitiesIfNeeded(): void {
    const allStorageKeys = environment.localities.map((loc) => loc.storageKey);

    // Si ya hay algo en el storage para alguna localidad, asumimos que el proceso ya ocurrió o está ocurriendo.
    // Solo pre-cacheamos si el storage está completamente vacío.
    if (allStorageKeys.every((key) => !sessionStorage.getItem(key))) {
      environment.localities.forEach(({ key, storageKey }) => {
        // No volver a pedir la que ya pedimos en ngOnInit
        if (key !== this.territoryPath()) {
          this.fetchDataForLocality(key, storageKey, false);
        }
      });
    }
  }

  sortByDate(value: string) {
    const valueNumber = Number(value);
    const fullData = this.dataListFull();

    if (!fullData || fullData.length === 0) return;

    const filtered = fullData.map((territoryCards: Card[]) => {
      return territoryCards.filter((card: Card) => {
        const dateStart = card.start ? new Date(card.start) : null;
        if (!dateStart) return false;

        if (valueNumber === 1) {
          // Últimos 6 meses
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return dateStart >= sixMonthsAgo;
        } else if (valueNumber === 2) {
          // Último año
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return dateStart >= oneYearAgo;
        } else {
          // Año específico
          return dateStart.getFullYear() === valueNumber;
        }
      });
    });

    this.filterDataListFull.set(filtered);
  }

  async downloadPDF() {
    if (!this.s13JPG()) return;

    await this.pdfService.generateTerritoryAssignmentPDF(
      this.s13JPG()!,
      this.territoriesNumber(),
      this.filterDataListFull(),
      this.territoryPath(),
    );
  }
}
