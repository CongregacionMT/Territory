import { Component, Inject, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { HttpClient } from '@angular/common/http';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-territory-assignment',
  templateUrl: './territory-assignment.component.html',
  styleUrls: ['./territory-assignment.component.scss']
})
export class TerritoryAssignmentComponent implements OnInit{
  routerBreadcrum: any = [];
  territoryPath: any;
  territoriesNumber: TerritoryNumberData[] = [];
  dataListFull: any[] = [];
  appleCount: any;
  s13PDF: any;
  loadingData: boolean = false;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoryDataService: TerritoryDataService,
    private territorieDataService: TerritoryDataService,
    private http: HttpClient,
    private spinner: SpinnerService,
    private rutaActiva: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.territoryPath = this.rutaActiva.snapshot.url.join('/');
    this.routerBreadcrum = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum = this.routerBreadcrum[3];
  }

  ngOnInit(): void {
    const storedNumberTerritory = sessionStorage.getItem("numberTerritory");
    const numberTerritory = storedNumberTerritory ? JSON.parse(storedNumberTerritory) : [];
    this.territoriesNumber = this.territoryPath === "mariaTeresa" ? numberTerritory.mariaTeresa : numberTerritory.christophersen;
    const nameLocalStorage = this.territoryPath === "mariaTeresa" ? "statisticDataMT" : "statisticDataCH";
    if (sessionStorage.getItem(nameLocalStorage)) {
      const storedStatisticData = sessionStorage.getItem(nameLocalStorage);
      this.dataListFull = storedStatisticData ? JSON.parse(storedStatisticData) : [];
      this.loadingData = true;
    }
    // Busco el PDF original para modificarlo
    const httpOptions = {
      'responseType'  : 'arraybuffer' as 'json'
    };
    const pdfPath = this.document.location.origin + '/assets/documents/S-13_S.pdf';
    console.log("path: ", pdfPath);

    this.http.get(pdfPath, httpOptions).subscribe({
      next: pdf => this.s13PDF = pdf
    });
  }
  async downloadPDF(){
    // Cargo el PDF original con la libreria 'pdf-lib'
    const pdfDoc = await PDFDocument.load(this.s13PDF)
    // Cargo una fuente generica
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Obtengo las paginas del documento
    const [firstPage] = pdfDoc.getPages();

    // Dibujo el año actual
    const dayNow = String(new Date().getFullYear());
    firstPage.drawText(dayNow, {
      x: 145,
      y: 750,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })

    let itemsListNumber: number[] = [];
    this.dataListFull.map((dataList, index: number) => {
      let items = 0;
      dataList.map((list: any) => {
        if(list.end){
          items ++;
        }
      });
      itemsListNumber.push(items);
    })
    console.log("itemsListNumber", itemsListNumber);
    let maxItems = Math.max(...itemsListNumber);
    console.log("max: ", maxItems);
    // while (maxItems > 4) {
    //   const newPage = pdfDoc.addPage([firstPage.getWidth(), firstPage.getHeight()]);
    //   const newPageBackground = await pdfDoc.embedPage(firstPage);
    //   newPage.drawPage(newPageBackground);
    //   newPage.drawText(dayNow, {
    //     x: 145,
    //     y: 750,
    //     size: 12,
    //     font: helveticaFont,
    //     color: rgb(0, 0, 0),
    //   })
    //   maxItems -= 4;
    // }
    console.log("paginas: ", pdfDoc.getPages());

    // Ancho y Alto inicial de cada valor
    const { width, height } = firstPage.getSize()
    let heigthTerritories = 675;
    let heigthDrivers = 685;
    let heigthStart = 670;
    let heigthEnd = 670;
    let widthDrivers = 61;
    let widthStart = (width / 4 - 10) / 4 - 5;
    let widthEnd = (width / 4) / 4 + 50;

    // Numeros de territorios
    this.territoriesNumber.map((number, index) => {
      let territorio = String(number.territorio);
      firstPage.drawText(territorio, {
        x: 50,
        y: heigthTerritories,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      heigthTerritories -= 31.5;
    });
    // Conductores y fechas
    let territoryNumberCount = 1;
    let listEnds = [];
    this.dataListFull.map((dataList) => {
      let items = 0;
      let pages = pdfDoc.getPages();
      dataList.map((list: any) => {
        if(list.end){
          if(items < 4){
            if(territoryNumberCount === list.numberTerritory){
              widthDrivers += 109;
              widthStart += 109;
              widthEnd += 109;
            } else {
              widthDrivers = 170;
              widthStart = 140;
              widthEnd = 195;
              heigthDrivers -= 31.5;
              heigthStart -= 31.5;
              heigthEnd -= 31.5;
              territoryNumberCount = list.numberTerritory;
            }
            // CONDUCTOR
            pages[0].drawText(list.driver, {
              x: widthDrivers,
              y: heigthDrivers,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            // FECHA DE INICIO
            // transformo la fecha
            let dateStart = list.start.split(" ")[0].split("-").reverse().join("-");
            pages[0].drawText(dateStart, {
              x: widthStart,
              y: heigthStart,
              size: 8,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            // FECHA DE CONCLUCIÓN
            // transformo la fecha
            let dateEnd = list.end.split(" ")[0].split("-").reverse().join("-");
            pages[0].drawText(dateEnd, {
              x: widthEnd,
              y: heigthEnd,
              size: 8,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            items ++;
            listEnds.push(list.end);
          }
        }
      })
    });

    // Guardo el PDF modificado
    const pdfBytes = await pdfDoc.save();

    // Creo el link de descarga y descargo el PDF
    let blob = new Blob([pdfBytes], {type: "application/pdf"});
    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    let fileName = 'Registro de territorios';
    link.download = fileName;
    link.click();
  }
}
