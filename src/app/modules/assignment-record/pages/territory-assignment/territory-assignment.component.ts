import { Component, OnInit, DOCUMENT, inject, signal } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { HttpClient } from '@angular/common/http';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';


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
    imports: [BreadcrumbComponent, ReactiveFormsModule, FormsModule, DatePipe]
})
export class TerritoryAssignmentComponent implements OnInit{
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private territorieDataService = inject(TerritoryDataService);
  private http = inject(HttpClient);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);
  private document = inject<Document>(DOCUMENT);
  private pdfService = inject(PdfService);

  routerBreadcrum = signal<BreadcrumbItem[]>([]);
  territoryPath = signal<string>("");
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
    const locality = environment.localities.find(loc => loc.key === path);
    return locality?.territoryPrefix || 'TerritorioMT';
  }

  private getStorageKeyByPath(path: string): string {
    const locality = environment.localities.find(loc => loc.key === path);
    return locality?.storageKey || 'registerStatisticDataTerritorioMT';
  }

  ngOnInit(): void {
    const storedNumberTerritory = sessionStorage.getItem("numberTerritory");
    const numberTerritory = storedNumberTerritory ? JSON.parse(storedNumberTerritory) : [];

    // Determinar el storage key basado en la ruta actual
    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);

    this.territoriesNumber.set(
      numberTerritory[currentPath] || []
    );

    if (sessionStorage.getItem(storageKey)) {
      const storedStatisticData = sessionStorage.getItem(storageKey);
      const parsedData = storedStatisticData ? JSON.parse(storedStatisticData) : [];
      this.dataListFull.set(parsedData);
      this.dataListFull().length !== 0 ? this.sortByDate('1') : [];
      this.loadingData.set(true);
    }

    if (!sessionStorage.getItem(storageKey)) {
      this.spinner.cargarSpinner();
      const territoryData = JSON.parse(sessionStorage.getItem('numberTerritory') as string);
      const territories = territoryData[currentPath] || [];

      const requests = territories.map((territory: any) =>
        this.territorieDataService.getCardTerritorieRegisterTable(territory.collection)
      );

      forkJoin(requests).subscribe((results: any) => {
        const statisticData: any[] = [];

        results.forEach((card: Card[]) => {
          for (let i = card.length - 1; i >= 0; i--) {
            let appleCount = 0;
            const list = card[i];
            if (list.applesData) {
              list.applesData.forEach((apple: CardApplesData) => {
                if (apple.checked === true) {
                  appleCount++;
                }
              });
            }
            if (appleCount === 0) {
              card.splice(i, 1);
            }
          }
          statisticData.push(card);
        });

        sessionStorage.setItem(storageKey, JSON.stringify(statisticData));
        this.dataListFull.set(statisticData);
        this.sortByDate(this.selectedValueFilter());
        this.spinner.cerrarSpinner();
      });
    }

    // Busco el PDF original para modificarlo
    const httpOptions = {
      responseType: 'arraybuffer' as 'arraybuffer'
    };
    const jpgPath = this.document.location.origin + '/assets/documents/S-13_S_image.jpg';
    // console.log("path: ", jpgPath);

    this.http.get(jpgPath, httpOptions).subscribe({
      next: jpg => this.s13JPG.set(jpg)
    });

    // Generar storage keys para TODAS las localidades dinámicamente
    const allStorageKeys = environment.localities.map(loc => loc.storageKey);

    if(!allStorageKeys.some(key => sessionStorage.getItem(key))){
      this.spinner.cargarSpinner();
      const territoryData = JSON.parse(sessionStorage.getItem('numberTerritory') as string);
      this.territoryNumberOfLocalStorage.set(territoryData);

      let completedRequests = 0;
      const totalRequests = environment.localities.length;

      environment.localities.forEach(({ key, storageKey }) => {
        const territories = this.territoryNumberOfLocalStorage()[key] || [];

        territories.forEach((territory: any) => {
          this.territorieDataService.getCardTerritorieRegisterTable(territory.collection)
          .subscribe((card) => {
            card.forEach((list: Card, index: number) => {
              this.appleCount.set(0);
              list.applesData?.forEach((apple: CardApplesData) => {
                if (apple.checked === true) {
                  this.appleCount.update(count => count + 1);
                }
              });
              if (this.appleCount() === 0) {
                card.splice(index, 1);
              }
            });
            const storeStatisticdData = sessionStorage.getItem(storageKey);
            const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
            statisticData.push(card);
            sessionStorage.setItem(storageKey, JSON.stringify(statisticData));
            completedRequests++;

            if (completedRequests === totalRequests) {
              this.spinner.cerrarSpinner();
            }
          });
        });
      });
    }
  }

  sortByDate(value: string){
    const valueNumber = Number(value);
    let newArray = [...this.dataListFull()];
    if(valueNumber === 1){
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const filteredDates = newArray.map((territory: Card[]) => {
        return territory.filter((date: Card) => {
          const dateStart = new Date(date.start || '');
          return dateStart >= sixMonthsAgo
        })
      })
      newArray = filteredDates;
    } else if(valueNumber === 2){
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const filteredDates = newArray.map((territory: Card[]) => {
        return territory.filter((date: Card) => {
          const dateStart = new Date(date.start || '');
          return dateStart >= oneYearAgo
        })
      })
      newArray = filteredDates;
    } else {
      const filteredDates = newArray.map((territory: Card[]) => {
        return territory.filter((date: Card) => {
          const dateStart = new Date(date.start || '');
          return valueNumber === dateStart.getFullYear();
        })
      })
      newArray = filteredDates;
    }
    this.filterDataListFull.set(newArray);
  }

  async downloadPDF() {
    if (!this.s13JPG()) return;

    await this.pdfService.generateTerritoryAssignmentPDF(
      this.s13JPG()!,
      this.territoriesNumber(),
      this.filterDataListFull(),
      this.territoryPath()
    );
  }
}
