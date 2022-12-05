import { Component, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { TerritoriesMTMockService } from '@shared/mocks/territories-mtmock.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-maria-teresa-assignment',
  templateUrl: './maria-teresa-assignment.component.html',
  styleUrls: ['./maria-teresa-assignment.component.scss'],
})
export class MariaTeresaAssignmentComponent implements OnInit {
  routerBreadcrum: any = [];
  territoriesMT: any[] = [];
  dataListFull: any[] = [];
  appleCount: any;
  s13PDF: any;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoriesMTMockService: TerritoriesMTMockService,
    private territoryDataService: TerritoryDataService,
    private territorieDataService: TerritoryDataService,
    private http: HttpClient,
  ) {
    this.territoriesMT = territoriesMTMockService.getTerritories();
  }
  
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum = this.routerBreadcrum[3];
    // RECIBIR LA DATA
    this.territoriesMT.map((territory) => {
      this.territorieDataService.getTerritorieRecord(territory.collection).subscribe({
        next: card => {
          card.map((list: any, index: any) => {
            this.appleCount = 0;
            list.applesData.map((apple: any) => {
              if(apple.checked === true){
                this.appleCount+=1
              }
            });
            if(this.appleCount === 0){
              card.splice(index, 1);
            }
          });
          this.dataListFull.push(card);
        }
      })
    });
    // Busco el PDF original para modificarlo
    const httpOptions = {
      'responseType'  : 'arraybuffer' as 'json'
    };
    this.http.get('../../../../../assets/documents/S-13_S.pdf', httpOptions).subscribe({
      next: pdf => this.s13PDF = pdf
    });
  }
  pathMT(){
    this.territoryDataService.pathNumberTerritory = 0;
  }
  async downloadPDF(){
    // Cargo el PDF original con la libreria 'pdf-lib'
    const pdfDoc = await PDFDocument.load(this.s13PDF)
    // Cargo una fuente generica
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Obtengo la pagina del documento
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]

    // Ancho y Alto inicial de cada valor
    const { width, height } = firstPage.getSize()
    let heigthTerritories = 675;
    let heigthDrivers = 685;
    let heigthStart = 670;
    let heigthEnd = 670;
    let widthDrivers = 61;
    let widthStart = (width / 4 - 10) / 4 - 5;
    let widthEnd = (width / 4) / 4 + 50;

    // Dibujo el año actual
    const dayNow = String(new Date().getFullYear());
    firstPage.drawText(dayNow, {
      x: 145,
      y: 750,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    })
    // Numeros de territorios
    this.territoriesMT.map((number, index) => {
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
    this.dataListFull.map((dataList) => {
      dataList.map((list: any) => {
        if(list.end){
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
          firstPage.drawText(list.driver, {
            x: widthDrivers,
            y: heigthDrivers,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
          // FECHA DE INICIO
          // transformo la fecha
          let dateStart = list.start.split(" ")[0].split("-").reverse().join("-");
          firstPage.drawText(dateStart, {
            x: widthStart,
            y: heigthStart,
            size: 8,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
          // FECHA DE CONCLUCIÓN
          // transformo la fecha
          let dateEnd = list.end.split(" ")[0].split("-").reverse().join("-");
          firstPage.drawText(dateEnd, {
            x: widthEnd,
            y: heigthEnd,
            size: 8,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
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
