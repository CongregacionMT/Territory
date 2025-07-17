import { Component, Inject, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { HttpClient } from '@angular/common/http';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Card } from '@core/models/Card';

@Component({
    selector: 'app-territory-assignment',
    templateUrl: './territory-assignment.component.html',
    styleUrls: ['./territory-assignment.component.scss'],
    standalone: false
})
export class TerritoryAssignmentComponent implements OnInit{
  routerBreadcrum: any = [];
  territoryPath: any;
  territoriesNumber: TerritoryNumberData[] = [];
  dataListFull: any[] = [];
  filterDataListFull: any[] = [];
  selectedValueFilter: string = '1';
  appleCount: any;
  s13JPG: any;
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
    const nameLocalStorage = this.territoryPath === "mariaTeresa" ? "registerStatisticDataMT" : "registerStatisticDataCH";
    if (sessionStorage.getItem(nameLocalStorage)) {
      const storedStatisticData = sessionStorage.getItem(nameLocalStorage);
      this.dataListFull = storedStatisticData ? JSON.parse(storedStatisticData) : [];
      this.dataListFull.length !== 0 ? this.sortByDate('1') : [];
      this.loadingData = true;
    }
    // Busco el PDF original para modificarlo
    const httpOptions = {
      'responseType'  : 'arraybuffer' as 'json'
    };
    const jpgPath = this.document.location.origin + '/assets/documents/S-13_S_image.jpg';
    console.log("path: ", jpgPath);

    this.http.get(jpgPath, httpOptions).subscribe({
      next: jpg => this.s13JPG = jpg
    });
  }
  sortByDate(value: string){
    const valueNumber = Number(value);
    let newArray = [...this.dataListFull];
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
    this.filterDataListFull = newArray;
  }
  async downloadPDF(){
    // Cargo el PDF original con la libreria 'pdf-lib y creo una pagina vacia'
    const pdfDoc = await PDFDocument.create()
    pdfDoc.addPage()
    // Cargo la imagen del S-13
    const jpgImageBytes = this.s13JPG;
    const jpgImage = await pdfDoc.embedJpg(jpgImageBytes)
    const jpgDims = jpgImage.scale(0.48);
    // Cargo una fuente generica
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Recorro los datos y si hay más de 4 por cada territorio, creo una nueva pagina
    const [firstPage] = pdfDoc.getPages();
    let itemsListNumber: number[] = [];
    this.filterDataListFull.map((dataList, index: number) => {
      let items = 0;
      dataList.map((list: any) => {
        if(list.end){
          items ++;
        }
      });
      itemsListNumber.push(items);
    })
    let maxItems = Math.max(...itemsListNumber);
    while (maxItems > 4) {
      pdfDoc.addPage([firstPage.getWidth(), firstPage.getHeight()]);
      maxItems -= 4;
    }
    // Ancho y Alto inicial de los datos a mostrar
    const { width, height } = firstPage.getSize()
    let heigthTerritories = 675;
    let heigthDrivers = 685;
    let heigthStart = 670;
    let heigthEnd = 670;
    let widthDrivers = 61;
    let widthStart = (width / 4 - 10) / 4 - 5;
    let widthEnd = (width / 4) / 4 + 50;

    // Obtengo las paginas del documento
    const pages = pdfDoc.getPages();
    pages.map((page) => {
      // Datos iniciales por cada iteracion
      heigthTerritories = 675;
      heigthDrivers = 685;
      heigthStart = 670;
      heigthEnd = 670;
      widthDrivers = 61;
      widthStart = (width / 4 - 10) / 4 - 5;
      widthEnd = (width / 4) / 4 + 50;
      // Dibujo el PDF
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: jpgDims.width,
        height: jpgDims.height,
      })
      // Dibujo el año actual
      const dayNow = String(new Date().getFullYear());
      page.drawText(dayNow, {
        x: 145,
        y: 750,
        size: 12,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      })
      // Numeros de territorios
      this.territoriesNumber.map((number, index) => {
        let territorio = String(number.territorio);
        page.drawText(territorio, {
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
      this.filterDataListFull.map((dataList) => {
        let items = 0;
        let inSecondPage = false;
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
                x: widthEnd -5,
                y: heigthEnd,
                size: 8,
                font: helveticaFont,
                color: rgb(0, 0, 0),
              });
              items ++;
            } else {
              if(!inSecondPage){
                inSecondPage = true;
                widthDrivers = 61;
                widthStart = (width / 4 - 10) / 4 - 5;
                widthEnd = (width / 4) / 4 + 50;
              }
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
              pages[1].drawText(list.driver, {
                x: widthDrivers,
                y: heigthDrivers,
                size: 10,
                font: helveticaFont,
                color: rgb(0, 0, 0),
              });
              // FECHA DE INICIO
              // transformo la fecha
              let dateStart = list.start.split(" ")[0].split("-").reverse().join("-");
              pages[1].drawText(dateStart, {
                x: widthStart,
                y: heigthStart,
                size: 8,
                font: helveticaFont,
                color: rgb(0, 0, 0),
              });
              // FECHA DE CONCLUCIÓN
              // transformo la fecha
              let dateEnd = list.end.split(" ")[0].split("-").reverse().join("-");
              pages[1].drawText(dateEnd, {
                x: widthEnd -5,
                y: heigthEnd,
                size: 8,
                font: helveticaFont,
                color: rgb(0, 0, 0),
              });
              items ++;
            }
          }
        })
      });
    })

    // Guardo el PDF modificado
    const pdfBytes = await pdfDoc.save();

    // Creo el link de descarga y descargo el PDF
    let blob = new Blob([pdfBytes], {type: "application/pdf"});
    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    let fileName = `Registro de territorios de ${this.territoryPath}`;
    link.download = fileName;
    link.click();
  }
}
