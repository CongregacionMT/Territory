import { Injectable, inject } from '@angular/core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { environment } from '@environments/environment';
import { Card } from '@core/models/Card';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  async generateTerritoryAssignmentPDF(
    s13JPG: ArrayBuffer,
    territoriesNumber: TerritoryNumberData[],
    filterDataListFull: Card[][],
    territoryPath: string
  ): Promise<void> {
    const pdfDoc = await PDFDocument.create();

    // Constant layout values
    const TERRITORIES_PER_PAGE = 20; // Adjusted to fit the page typically
    const ASSIGNMENTS_PER_PAGE = 4;
    
    // Cargar imagen S-13
    const jpgImage = await pdfDoc.embedJpg(s13JPG);
    const jpgDims = jpgImage.scale(1);

    // Fuente
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const currentYear = new Date().getFullYear().toString();

    // Helper to add a page and draw common elements
    const addPageWithBackground = () => {
      const page = pdfDoc.addPage([jpgDims.width, jpgDims.height]);
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
      return page;
    };

    // Calculate vertical chunks (territories)
    const totalTerritories = territoriesNumber.length;
    
    // Calculate layout parameters
    const startY_Territory = jpgDims.height - 345;
    const rowHeight = 65;
    
    const startY_Assignment = jpgDims.height - 360;
    const colWidth = jpgDims.width * 0.18;

    // Iterate through chunks of territories
    for (let tIndex = 0; tIndex < totalTerritories; tIndex += TERRITORIES_PER_PAGE) {
      const territoryChunk = territoriesNumber.slice(tIndex, tIndex + TERRITORIES_PER_PAGE);
      const dataChunk = filterDataListFull.slice(tIndex, tIndex + TERRITORIES_PER_PAGE);

      // Analyze max assignments in this chunk to determine horizontal pages needed
      const maxAssignmentsInChunk = Math.max(
        0, 
        ...dataChunk.map(dl => dl.filter((item: any) => item.end).length)
      );

      const horizontalPagesNeeded = maxAssignmentsInChunk > 0 
        ? Math.ceil(maxAssignmentsInChunk / ASSIGNMENTS_PER_PAGE) 
        : 1;

      // Generate pages for this vertical chunk
      for (let hPage = 0; hPage < horizontalPagesNeeded; hPage++) {
        const page = addPageWithBackground();

        // --- DRAW TERRITORY NUMBERS (Vertical Column) ---
        territoryChunk.forEach((territorio, index) => {
          const y = startY_Territory - index * rowHeight;
          page.drawText(String(territorio.territorio), {
            x: jpgDims.width * 0.085,
            y,
            size: 24,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        });

        // --- DRAW ASSIGNMENTS (Horizontal Grid) ---
        const startIndex = hPage * ASSIGNMENTS_PER_PAGE;
        const endIndex = startIndex + ASSIGNMENTS_PER_PAGE;

        dataChunk.forEach((rowAssignments, rowIndex) => {
          // Filter only completed assignments
          const completedAssignments = rowAssignments.filter((item: any) => item.end);
          
          // Get the slice for this page
          const assignmentsForPage = completedAssignments.slice(startIndex, endIndex);

          assignmentsForPage.forEach((item: any, colIndex) => {
            const xDriver = jpgDims.width * 0.26 + colIndex * colWidth;
            const xStart = xDriver - 30;
            const xEnd = xDriver + 80;
            
            // Adjust Y for the specific row in the chunk
            const yAdjusted = startY_Assignment - rowIndex * rowHeight;

            // --- DRAW CONTENT ---
            const driverName = item.driver;
            const fontSize = 20;
            const textWidth = helveticaFont.widthOfTextAtSize(driverName, fontSize);

            // Center Name
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
          });
        });

      }
    }

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
