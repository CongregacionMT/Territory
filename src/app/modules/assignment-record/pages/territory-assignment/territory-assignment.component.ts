import { Component, OnInit, DOCUMENT, inject, signal } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { HttpClient } from '@angular/common/http';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Card } from '@core/models/Card';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardSComponent } from '../../../../shared/components/card-s/card-s.component';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-territory-assignment',
    templateUrl: './territory-assignment.component.html',
    styleUrls: ['./territory-assignment.component.scss'],
    imports: [BreadcrumbComponent, ReactiveFormsModule, FormsModule, CardSComponent, RouterLink, DatePipe]
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

  constructor(...args: unknown[]);
  constructor() {
    this.territoryPath.set(this.rutaActiva.snapshot.url.join('/'));
    const breadcrumData = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum.set(breadcrumData[3]);
  }

  ngOnInit(): void {
    const storedNumberTerritory = sessionStorage.getItem("numberTerritory");
    const numberTerritory = storedNumberTerritory ? JSON.parse(storedNumberTerritory) : [];
    this.territoriesNumber.set(this.territoryPath() === "wheelwright" ? numberTerritory.wheelwright : numberTerritory.rural);

    const nameLocalStorage = this.territoryPath() === "wheelwright" ? "registerStatisticDataW" : "registerStatisticDataR";
    if (sessionStorage.getItem(nameLocalStorage)) {
      const storedStatisticData = sessionStorage.getItem(nameLocalStorage);
      const parsedData = storedStatisticData ? JSON.parse(storedStatisticData) : [];
      this.dataListFull.set(parsedData);
      this.dataListFull().length !== 0 ? this.sortByDate('1') : [];
      this.loadingData.set(true);
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
  const jpgDims = jpgImage.scale(1); // Usamos tamaño original

  // Agregar página con el tamaño exacto de la imagen
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
      x: jpgDims.width * 0.25, // Ajustalo si hace falta
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
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `Registro de territorios de ${this.territoryPath()}`;
  link.click();
}

}
