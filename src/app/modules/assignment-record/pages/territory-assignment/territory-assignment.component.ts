import { Component, OnInit, DOCUMENT, inject, signal } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { HttpClient } from '@angular/common/http';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';

import { Card } from '@core/models/Card';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardSComponent } from '../../../../shared/components/card-s/card-s.component';
import { DatePipe } from '@angular/common';
import { environment } from '@environments/environment';

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

  routerBreadcrum = signal<any>([]);
  territoryPath = signal<any>(null);
  territoriesNumber = signal<TerritoryNumberData[]>([]);
  dataListFull = signal<any[]>([]);
  filterDataListFull = signal<any[]>([]);
  selectedValueFilter = signal<string>('1');
  appleCount = signal<any>(null);
  s13JPG = signal<any>(null);
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

        results.forEach((card: any[]) => {
          for (let i = card.length - 1; i >= 0; i--) {
            let appleCount = 0;
            const list = card[i];
            if (list.applesData) {
              list.applesData.forEach((apple: any) => {
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
      'responseType'  : 'arraybuffer' as 'json'
    };
    const jpgPath = this.document.location.origin + '/assets/documents/S-13_S_image.jpg';
    console.log("path: ", jpgPath);

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
            card.forEach((list: any, index: any) => {
              this.appleCount.set(0);
              list.applesData?.forEach((apple: any) => {
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
    const pdfDoc = await PDFDocument.create();

    // Cargar imagen S-13
    const jpgImageBytes = this.s13JPG();
    const jpgImage = await pdfDoc.embedJpg(jpgImageBytes);
    const jpgDims = jpgImage.scale(1);

    // Agregar página inicial
    pdfDoc.addPage([jpgDims.width, jpgDims.height]);

    // Fuente
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Preparar cantidad de páginas según asignaciones
    const maxItems = Math.max(...this.filterDataListFull().map(dl =>
      dl.filter((item: any) => item.end).length
    ));

    const extraPages = Math.ceil(maxItems / 4) - 1;
    for (let i = 0; i < extraPages; i++) {
      pdfDoc.addPage([jpgDims.width, jpgDims.height]);
    }

    const pages = pdfDoc.getPages();
    const currentYear = new Date().getFullYear().toString();

    pages.forEach((page, pageIndex) => {
      // Dibujar fondo
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: jpgDims.width,
        height: jpgDims.height,
      });

      // Año de servicio
      page.drawText(currentYear, {
        x: jpgDims.width * 0.25,
        y: jpgDims.height - 195,
        size: 24,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });

      // Números de territorio
      const startY = jpgDims.height - 345;
      const rowHeight = 65;
      this.territoriesNumber().forEach((territorio, index) => {
        const y = startY - index * rowHeight;
        page.drawText(String(territorio.territorio), {
          x: jpgDims.width * 0.085,
          y,
          size: 24,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      });
    });

    // Asignaciones
    const startY = jpgDims.height - 295;
    const rowHeight = 65;
    const colWidth = jpgDims.width * 0.18;

    this.filterDataListFull().forEach((dataList, index) => {
      let rowIndex = 0;
      let colIndex = 0;
      let pageIndex = 0;
      let currentTerritory = 0;

      dataList.forEach((item: any) => {
        if (item.end) {
          // Cambiar de columna
          if (colIndex === 4) {
            colIndex = 0;
            rowIndex++;
          }

          if (rowIndex === 19) {
            pageIndex++;
            rowIndex = 0;
          }

          const page = pages[pageIndex];
          const xDriver = jpgDims.width * 0.26 + colIndex * colWidth;
          const xStart = xDriver - 30;
          const xEnd = xDriver + 80;
          const y = startY - index * rowHeight;

          if (currentTerritory !== item.numberTerritory) {
            currentTerritory = item.numberTerritory;
            rowIndex++;
            colIndex = 0;
          }

          const yAdjusted = y - rowIndex * rowHeight;

          const driverName = item.driver;
          const fontSize = 20;
          const textWidth = helveticaFont.widthOfTextAtSize(driverName, fontSize);

          // Centrado horizontal dentro del cuadrado
          const centerX = xDriver + (colWidth / 2);
          const xCentered = centerX - (textWidth / 2);

          // Conductor
          page.drawText(driverName, {
            x: xCentered - 40,
            y: yAdjusted + 30,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });

          // Fecha inicio
          const dateStart = item.start.split(" ")[0].split("-").reverse().join("-");
          page.drawText(dateStart, {
            x: xStart,
            y: yAdjusted,
            size: 18,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });

          // Fecha fin
          const dateEnd = item.end.split(" ")[0].split("-").reverse().join("-");
          page.drawText(dateEnd, {
            x: xEnd,
            y: yAdjusted,
            size: 18,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });

          colIndex++;
        }
      });
    });

    // Descargar PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Obtener nombre de la localidad actual
    const currentPath = this.territoryPath();
    const locality = environment.localities.find(loc => loc.key === currentPath);
    const localityName = locality?.name || 'Territorio';

    // Descargar el archivo PDF
    const a = document.createElement('a');
    a.href = url;
    a.download = `Registro de territorios - ${localityName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
