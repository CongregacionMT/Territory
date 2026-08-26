import { Injectable } from '@angular/core';
import { Departure } from '@core/models/Departures';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { environment } from '@environments/environment';

/**
 * Modes for PDF generation:
 * - 'color': uses the full color palette for the table headers and rows.
 * - 'bw': black and white mode optimized for ink saving.
 */
export type PrintMode = 'color' | 'bw';

/**
 * Represents the Friday-to-Thursday print week range.
 */
interface PrintWeekRange {
  friday: Date;
  thursday: Date;
  label: string;
}

/**
 * Column widths for the PDF table.
 */
interface ColWidths {
  day: number;
  schedule: number;
  driver: number;
  point: number;
  territories: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeparturePdfService {
  // A4 dimensions in points (1 pt = 1/72 inch)
  private readonly PAGE_WIDTH = 595.28;
  private readonly PAGE_HEIGHT = 841.89;
  private readonly MARGIN = 10; // Minimal margins to maximize space
  private readonly CONTENT_WIDTH = 595.28 - 20; // PAGE_WIDTH - 2*MARGIN

  // Color palette for the color mode
  private readonly COLORS = {
    primary: rgb(0.01, 0.47, 0.74), // #0277bd
    primaryLight: rgb(0.88, 0.96, 0.99), // #e1f5fe
    headerBg: rgb(0.01, 0.34, 0.61), // #01579b
    white: rgb(1, 1, 1),
    black: rgb(0, 0, 0),
    gray: rgb(0.42, 0.42, 0.42), // #6c6c6c
    lightGray: rgb(0.93, 0.93, 0.93), // #ededed
    veryLightGray: rgb(0.97, 0.97, 0.97), // #f8f8f8
    rowAlt: rgb(0.96, 0.98, 1), // #f5f9ff
    eventBg: rgb(1, 0.98, 0.88), // #fff9e0
    specificGroupBg: rgb(0.85, 0.94, 0.85), // Light green for specific group
    borderGray: rgb(0.78, 0.78, 0.78), // #c8c8c8
    groupHeader: rgb(0.01, 0.47, 0.74), // #0277bd
  };

  // B&W palette
  private readonly BW_COLORS = {
    primary: rgb(0, 0, 0),
    primaryLight: rgb(0.93, 0.93, 0.93),
    headerBg: rgb(0.15, 0.15, 0.15),
    white: rgb(1, 1, 1),
    black: rgb(0, 0, 0),
    gray: rgb(0.35, 0.35, 0.35),
    lightGray: rgb(0.9, 0.9, 0.9),
    veryLightGray: rgb(0.96, 0.96, 0.96),
    rowAlt: rgb(0.94, 0.94, 0.94),
    eventBg: rgb(0.92, 0.92, 0.92),
    specificGroupBg: rgb(0.86, 0.86, 0.86), // Noticeable gray
    borderGray: rgb(0.7, 0.7, 0.7),
    groupHeader: rgb(0, 0, 0),
  };

  /**
   * Calculate the Friday-to-Thursday print range from a Monday-based weekId.
   *
   * The DB stores weeks as Mon–Sun. For printing we want Fri–Thu:
   * - Given a weekId (e.g. "2026-04-20" = Monday Apr 20),
   *   the print range is Friday of *that same week* (Apr 24)
   *   through Thursday of *the next week* (Apr 30).
   */
  getPrintWeekRange(weekId: string): PrintWeekRange {
    // Parse the weekId as a Monday date
    const monday = new Date(weekId + 'T12:00:00');

    // Friday of the same week = Monday + 4 days
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    // Thursday of the next week = Monday + 10 days
    const thursday = new Date(monday);
    thursday.setDate(monday.getDate() + 10);

    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    const label = `Viernes ${friday.getDate()} de ${months[friday.getMonth()]} al Jueves ${thursday.getDate()} de ${months[thursday.getMonth()]}`;

    return { friday, thursday, label };
  }

  /**
   * Filter and reorder departures for the print week range (Fri–Thu).
   * Takes the current week departures and the next week departures,
   * then picks only the dates that fall within Friday–Thursday.
   */
  getDeparturesForPrintWeek(
    currentWeekDepartures: Departure[],
    nextWeekDepartures: Departure[],
    weekId: string,
  ): Departure[] {
    const { friday, thursday } = this.getPrintWeekRange(weekId);

    // Normalize dates for comparison (strip time)
    const fridayStr = this.dateToString(friday);
    const thursdayStr = this.dateToString(thursday);

    const allDepartures = [...currentWeekDepartures, ...nextWeekDepartures];

    return allDepartures
      .filter((dep) => {
        const depDate = dep.date; // Format: YYYY-MM-DD
        return depDate >= fridayStr && depDate <= thursdayStr;
      })
      .sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return a.schedule.localeCompare(b.schedule);
      });
  }

  /**
   * Get the weekId for the next week (next Monday).
   */
  getNextWeekId(weekId: string): string {
    const monday = new Date(weekId + 'T12:00:00');
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    return this.dateToString(nextMonday);
  }

  private dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generate a PDF with ALL groups' departures on the same sheet(s).
   * Each group gets its own section with a header.
   * Ink-efficient: no dark backgrounds, just clean text headers.
   * Maximized readability: large fonts, minimal margins.
   */
  async generateAllGroupsPdf(
    departures: Departure[],
    weekLabel: string,
    mode: PrintMode,
    groupNumbers: number[],
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const colors = mode === 'color' ? this.COLORS : this.BW_COLORS;

    // Column widths — optimized for max readability
    const colWidths: ColWidths = {
      day: 80,
      schedule: 50,
      driver: 145,
      point: 145,
      territories: this.CONTENT_WIDTH - 80 - 50 - 145 - 145,
    };

    let page = pdfDoc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);
    let yPos = this.PAGE_HEIGHT - this.MARGIN;

    // Draw lightweight page header (ink-efficient)
    yPos = this.drawLightHeader(page, yPos, fontBold, fontRegular, colors, weekLabel);

    // Sort group numbers
    const sortedGroups = [...groupNumbers].sort((a, b) => a - b);

    for (let gIdx = 0; gIdx < sortedGroups.length; gIdx++) {
      const groupNum = sortedGroups[gIdx];

      // Filter departures for this group
      const groupDepartures = departures.filter((dep) => dep.group === groupNum || dep.group === 0);

      if (groupDepartures.length === 0) continue;

      // Group section header — check if enough space
      const groupHeaderHeight = sortedGroups.length > 1 ? 22 : 0;
      if (yPos - groupHeaderHeight - 20 < this.MARGIN + 20) {
        this.drawFooter(page, fontItalic, colors);
        page = pdfDoc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);
        yPos = this.PAGE_HEIGHT - this.MARGIN;
      }

      // Draw group section header (only if multiple groups)
      if (sortedGroups.length > 1) {
        yPos = this.drawGroupSectionHeader(page, yPos, fontBold, fontRegular, colors, groupNum);
      }

      // Draw table header
      yPos = this.drawTableHeaderCompact(page, yPos, fontBold, colors, colWidths);

      // Group departures by date
      const groupedByDate = this.groupDeparturesByDate(groupDepartures);

      for (const [dateStr, deps] of groupedByDate) {
        for (let i = 0; i < deps.length; i++) {
          const dep = deps[i];

          // Estimate row height
          const rowHeight = this.estimateRowHeightCompact(dep, fontRegular, colWidths);

          // Check if we need a new page
          if (yPos - rowHeight < this.MARGIN + 15) {
            this.drawFooter(page, fontItalic, colors);
            page = pdfDoc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);
            yPos = this.PAGE_HEIGHT - this.MARGIN;

            // Re-draw table header on new page
            if (sortedGroups.length > 1) {
              yPos = this.drawGroupSectionHeader(
                page,
                yPos,
                fontBold,
                fontRegular,
                colors,
                groupNum,
              );
            }
            yPos = this.drawTableHeaderCompact(page, yPos, fontBold, colors, colWidths);
          }

          const isEvenRow = i % 2 === 0;
          yPos = this.drawDepartureRowCompact(
            page,
            yPos,
            dep,
            isEvenRow,
            fontBold,
            fontRegular,
            colors,
            colWidths,
          );
        }
        // Small separator between days
        yPos -= 1;
      }

      // Spacing between groups
      if (gIdx < sortedGroups.length - 1) {
        yPos -= 8;
      }
    }

    // Draw footer on last page
    this.drawFooter(page, fontItalic, colors);

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  /**
   * Lightweight header — no dark backgrounds, minimal ink.
   * Just clean text: congregation name, week range.
   */
  private drawLightHeader(
    page: PDFPage,
    yPos: number,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    colors: typeof this.COLORS,
    weekLabel: string,
  ): number {
    const congregationName = environment.congregationName;

    // Title line — small, centered, no background
    const title = `Salidas a predicar — Congregación ${congregationName}`;
    const titleSize = 12;
    const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
      x: this.MARGIN + (this.CONTENT_WIDTH - titleWidth) / 2,
      y: yPos - 14,
      size: titleSize,
      font: fontBold,
      color: colors.black,
    });

    // Week range — under the title
    const weekSize = 10;
    const weekWidth = fontRegular.widthOfTextAtSize(weekLabel, weekSize);
    page.drawText(weekLabel, {
      x: this.MARGIN + (this.CONTENT_WIDTH - weekWidth) / 2,
      y: yPos - 28,
      size: weekSize,
      font: fontRegular,
      color: colors.gray,
    });

    // Thin separator line
    const lineY = yPos - 34;
    page.drawLine({
      start: { x: this.MARGIN, y: lineY },
      end: { x: this.MARGIN + this.CONTENT_WIDTH, y: lineY },
      thickness: 0.8,
      color: colors.borderGray,
    });

    return lineY - 4;
  }

  /**
   * Draw a group section header — minimal ink, just the group name with a line
   */
  private drawGroupSectionHeader(
    page: PDFPage,
    yPos: number,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    colors: typeof this.COLORS,
    groupNumber: number,
  ): number {
    const groupText = groupNumber === 0 ? 'General' : `Grupo ${groupNumber}`;
    const textSize = 11;

    // Draw group name
    page.drawText(groupText, {
      x: this.MARGIN + 4,
      y: yPos - 14,
      size: textSize,
      font: fontBold,
      color: colors.groupHeader,
    });

    // Short underline under the group name
    const textWidth = fontBold.widthOfTextAtSize(groupText, textSize);
    page.drawLine({
      start: { x: this.MARGIN + 4, y: yPos - 17 },
      end: { x: this.MARGIN + 4 + textWidth, y: yPos - 17 },
      thickness: 1.5,
      color: colors.groupHeader,
    });

    // Add legend for specific group
    if (groupNumber > 0) {
      page.drawText('(*) Salida específica de tu grupo', {
        x: this.MARGIN + 4 + textWidth + 12,
        y: yPos - 14,
        size: 8,
        font: fontRegular,
        color: colors.gray,
      });
    }

    return yPos - 22;
  }

  /**
   * Compact table header — larger text, no excessive padding.
   */
  private drawTableHeaderCompact(
    page: PDFPage,
    yPos: number,
    fontBold: PDFFont,
    colors: typeof this.COLORS,
    colWidths: ColWidths,
  ): number {
    const headerHeight = 18;
    const headerY = yPos - headerHeight;

    // Light background for header row
    page.drawRectangle({
      x: this.MARGIN,
      y: headerY,
      width: this.CONTENT_WIDTH,
      height: headerHeight,
      color: colors.primaryLight,
    });

    // Bottom border
    page.drawLine({
      start: { x: this.MARGIN, y: headerY },
      end: { x: this.MARGIN + this.CONTENT_WIDTH, y: headerY },
      thickness: 0.8,
      color: colors.borderGray,
    });

    // Column headers
    const headers = ['Día', 'Hora', 'Conductor', 'Punto de encuentro', 'Territorios'];
    const widths: number[] = [
      colWidths.day,
      colWidths.schedule,
      colWidths.driver,
      colWidths.point,
      colWidths.territories,
    ];
    const textSize = 9;
    let xPos = this.MARGIN;

    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], {
        x: xPos + 4,
        y: headerY + 5,
        size: textSize,
        font: fontBold,
        color: colors.primary,
      });

      // Column separator
      if (i < headers.length - 1) {
        page.drawLine({
          start: { x: xPos + widths[i], y: yPos },
          end: { x: xPos + widths[i], y: headerY },
          thickness: 0.5,
          color: colors.borderGray,
        });
      }

      xPos += widths[i];
    }

    return headerY;
  }

  /**
   * Compact departure row — optimized font sizes for readability.
   */
  private drawDepartureRowCompact(
    page: PDFPage,
    yPos: number,
    dep: Departure,
    isEvenRow: boolean,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    colors: typeof this.COLORS,
    colWidths: ColWidths,
  ): number {
    const rowHeight = this.estimateRowHeightCompact(dep, fontRegular, colWidths);
    const rowY = yPos - rowHeight;

    // Row background
    let bgColor = isEvenRow ? colors.white : colors.rowAlt;
    if (dep.isEvent) {
      bgColor = colors.eventBg;
    } else if (dep.group > 0) {
      bgColor = colors.specificGroupBg;
    }

    page.drawRectangle({
      x: this.MARGIN,
      y: rowY,
      width: this.CONTENT_WIDTH,
      height: rowHeight,
      color: bgColor,
    });

    // Bottom border
    page.drawLine({
      start: { x: this.MARGIN, y: rowY },
      end: { x: this.MARGIN + this.CONTENT_WIDTH, y: rowY },
      thickness: 0.3,
      color: colors.lightGray,
    });

    const textSize = 10;
    const smallTextSize = 9;
    const textColor = colors.black;
    const textY = rowY + rowHeight - 13;

    let xPos = this.MARGIN;

    // Day column
    const dayName = this.getDayOfWeek(dep.date);
    const dateFormatted = this.formatShortDate(dep.date);

    page.drawText(dayName, {
      x: xPos + 4,
      y: textY,
      size: textSize,
      font: fontBold,
      color: colors.primary,
    });
    page.drawText(dateFormatted, {
      x: xPos + 4,
      y: textY - 12,
      size: smallTextSize - 1,
      font: fontRegular,
      color: colors.gray,
    });

    // Column separators
    const widths: number[] = [
      colWidths.day,
      colWidths.schedule,
      colWidths.driver,
      colWidths.point,
      colWidths.territories,
    ];
    let sepX = this.MARGIN;
    for (let i = 0; i < widths.length - 1; i++) {
      sepX += widths[i];
      page.drawLine({
        start: { x: sepX, y: yPos },
        end: { x: sepX, y: rowY },
        thickness: 0.3,
        color: colors.lightGray,
      });
    }

    xPos += colWidths.day;

    // Schedule column
    page.drawText(dep.schedule + 'hs', {
      x: xPos + 4,
      y: textY,
      size: textSize,
      font: fontBold,
      color: textColor,
    });
    xPos += colWidths.schedule;

    // Driver / Event column
    if (dep.isEvent) {
      const eventTitle = dep.title || 'Evento especial';
      const wrappedLines = this.wrapText(eventTitle, colWidths.driver - 8, textSize, fontBold);
      wrappedLines.forEach((line, idx) => {
        page.drawText(line, {
          x: xPos + 4,
          y: textY - idx * 12,
          size: textSize,
          font: fontBold,
          color: colors.gray,
        });
      });
    } else {
      let driverText = dep.driver;
      if (dep.group > 0) {
        driverText += ' (*)';
      }
      const wrappedDriver = this.wrapText(driverText, colWidths.driver - 8, textSize, fontRegular);
      wrappedDriver.forEach((line, idx) => {
        page.drawText(line, {
          x: xPos + 4,
          y: textY - idx * 12,
          size: textSize,
          font: fontRegular,
          color: textColor,
        });
      });
    }
    xPos += colWidths.driver;

    // Point column
    const wrappedPoint = this.wrapText(dep.point, colWidths.point - 8, smallTextSize, fontRegular);
    wrappedPoint.forEach((line, idx) => {
      page.drawText(line, {
        x: xPos + 4,
        y: textY - idx * 11,
        size: smallTextSize,
        font: fontRegular,
        color: textColor,
      });
    });
    xPos += colWidths.point;

    // Territories column
    if (!dep.isEvent && dep.territory?.length > 0) {
      const territoriesText = dep.territory.join(', ');
      const wrappedTerritories = this.wrapText(
        territoriesText,
        colWidths.territories - 8,
        smallTextSize,
        fontRegular,
      );
      wrappedTerritories.forEach((line, idx) => {
        page.drawText(line, {
          x: xPos + 4,
          y: textY - idx * 11,
          size: smallTextSize,
          font: fontRegular,
          color: textColor,
        });
      });
    }

    return rowY;
  }

  private estimateRowHeightCompact(dep: Departure, font: PDFFont, colWidths: ColWidths): number {
    const baseHeight = 30;
    const lineHeight = 12;

    let maxExtraLines = 0;

    if (dep.driver) {
      const lines = this.wrapText(dep.driver, colWidths.driver - 8, 10, font);
      maxExtraLines = Math.max(maxExtraLines, lines.length - 1);
    }
    if (dep.point) {
      const lines = this.wrapText(dep.point, colWidths.point - 8, 9, font);
      maxExtraLines = Math.max(maxExtraLines, lines.length - 1);
    }
    if (dep.territory?.length > 0) {
      const territoriesText = dep.territory.join(', ');
      const lines = this.wrapText(territoriesText, colWidths.territories - 8, 9, font);
      maxExtraLines = Math.max(maxExtraLines, lines.length - 1);
    }
    if (dep.isEvent && dep.title) {
      const lines = this.wrapText(dep.title, colWidths.driver - 8, 10, font);
      maxExtraLines = Math.max(maxExtraLines, lines.length - 1);
    }

    return baseHeight + maxExtraLines * lineHeight;
  }

  // ============================================================
  // Legacy single-group PDF generation (kept for backward compat)
  // ============================================================

  /**
   * Generate the PDF document for departures (single group).
   */
  async generatePdf(
    departures: Departure[],
    weekLabel: string,
    mode: PrintMode,
    groupNumber: string,
  ): Promise<Uint8Array> {
    // Delegate to the all-groups method with a single group
    const groupNum = parseInt(groupNumber, 10);
    return this.generateAllGroupsPdf(departures, weekLabel, mode, [groupNum]);
  }

  private drawFooter(page: PDFPage, fontItalic: PDFFont, colors: typeof this.COLORS): void {
    const footerText = `Generado el ${new Date().toLocaleDateString('es-AR')}`;
    const footerSize = 7;
    const footerWidth = fontItalic.widthOfTextAtSize(footerText, footerSize);

    page.drawText(footerText, {
      x: this.MARGIN + this.CONTENT_WIDTH - footerWidth,
      y: this.MARGIN - 5,
      size: footerSize,
      font: fontItalic,
      color: colors.gray,
    });
  }

  private wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
    if (!text) return [''];

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  private groupDeparturesByDate(departures: Departure[]): Map<string, Departure[]> {
    const map = new Map<string, Departure[]>();
    for (const dep of departures) {
      const existing = map.get(dep.date) || [];
      existing.push(dep);
      map.set(dep.date, existing);
    }
    return map;
  }

  private getDayOfWeek(dateString: string): string {
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const date = new Date(dateString + 'T00:00:00');
    return daysOfWeek[date.getDay()];
  }

  private formatShortDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate();
    const months = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];
    return `${day} ${months[date.getMonth()]}`;
  }

  /**
   * Trigger download of the generated PDF.
   */
  downloadPdf(pdfBytes: Uint8Array, filename: string): void {
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
