import { Injectable, inject } from '@angular/core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  async generateTerritoryAssignmentPDF(
    s13JPG: ArrayBuffer,
    territoriesNumber: TerritoryNumberData[],
    filterDataListFull: any[],
    territoryPath: string
  ): Promise<void> {
    const pdfDoc = await PDFDocument.create();

    // Cargar imagen S-13
    const jpgImage = await pdfDoc.embedJpg(s13JPG);
    const jpgDims = jpgImage.scale(1);

    // Agregar página inicial
    pdfDoc.addPage([jpgDims.width, jpgDims.height]);

    // Fuente
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Preparar cantidad de páginas según asignaciones
    const maxItems = Math.max(...filterDataListFull.map(dl =>
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
      territoriesNumber.forEach((territorio, index) => {
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

    filterDataListFull.forEach((dataList, index) => {
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
    const currentPath = territoryPath;
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
