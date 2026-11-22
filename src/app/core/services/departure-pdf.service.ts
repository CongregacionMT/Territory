import { Injectable } from '@angular/core';
import { Departure } from '@core/models/Departures';
import type { PDFDocument, PDFPage, PDFFont, RGB } from 'pdf-lib';
import { environment } from '@environments/environment';
import { compareDeparturesByDateTime } from '@shared/utils/departure-sort.utils';

interface PdfColors {
  primary: RGB;
  primaryLight: RGB;
  headerBg: RGB;
  white: RGB;
  black: RGB;
  gray: RGB;
  lightGray: RGB;
  veryLightGray: RGB;
  rowAlt: RGB;
  eventBg: RGB;
  specificGroupBg: RGB;
  borderGray: RGB;
  groupHeader: RGB;
}

/**
 * Modes for PDF generation:
 * - 'color': uses the full color palette for the table headers and rows.
 * - 'bw': black and white mode optimized for ink saving.
 */
export type PrintMode = 'color' | 'bw';

/**
 * Represents the print week range: from the day after the meeting
 * up to (and including) the next meeting day.
 */
interface PrintWeekRange {
  start: Date;
  end: Date;
  label: string;
}

/** Default meeting day when not configured (JS getDay convention: 4 = Thursday). */
const DEFAULT_MEETING_DAY = 4;

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const MONTH_NAMES = [
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

/**
 * Mutable state shared while rendering the all-groups PDF.
 */
interface PdfRenderContext {
  pdfDoc: PDFDocument;
  page: PDFPage;
  yPos: number;
  fontBold: PDFFont;
  fontRegular: PDFFont;
  fontItalic: PDFFont;
  colors: PdfColors;
  colWidths: ColWidths;
  showGroupHeaders: boolean;
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

  // Get color palette for the mode
  private getColors(rgbFn: typeof import('pdf-lib').rgb, mode: PrintMode): PdfColors {
    if (mode === 'color') {
      return {
        primary: rgbFn(0.01, 0.47, 0.74), // #0277bd
        primaryLight: rgbFn(0.88, 0.96, 0.99), // #e1f5fe
        headerBg: rgbFn(0.01, 0.34, 0.61), // #01579b
        white: rgbFn(1, 1, 1),
        black: rgbFn(0, 0, 0),
        gray: rgbFn(0.42, 0.42, 0.42), // #6c6c6c
        lightGray: rgbFn(0.93, 0.93, 0.93), // #ededed
        veryLightGray: rgbFn(0.97, 0.97, 0.97), // #f8f8f8
        rowAlt: rgbFn(0.96, 0.98, 1), // #f5f9ff
        eventBg: rgbFn(1, 0.98, 0.88), // #fff9e0
        specificGroupBg: rgbFn(0.85, 0.94, 0.85), // Light green for specific group
        borderGray: rgbFn(0.78, 0.78, 0.78), // #c8c8c8
        groupHeader: rgbFn(0.01, 0.47, 0.74), // #0277bd
      };
    }
    return {
      primary: rgbFn(0, 0, 0),
      primaryLight: rgbFn(0.93, 0.93, 0.93),
      headerBg: rgbFn(0.15, 0.15, 0.15),
      white: rgbFn(1, 1, 1),
      black: rgbFn(0, 0, 0),
      gray: rgbFn(0.35, 0.35, 0.35),
      lightGray: rgbFn(0.9, 0.9, 0.9),
      veryLightGray: rgbFn(0.96, 0.96, 0.96),
      rowAlt: rgbFn(0.94, 0.94, 0.94),
      eventBg: rgbFn(0.92, 0.92, 0.92),
      specificGroupBg: rgbFn(0.86, 0.86, 0.86), // Noticeable gray
      borderGray: rgbFn(0.7, 0.7, 0.7),
      groupHeader: rgbFn(0, 0, 0),
    };
  }

  /**
   * Configured midweek meeting day (JS getDay convention: 0 = Sunday ... 6 = Saturday).
   * Falls back to Thursday when missing or invalid.
   */
  getMeetingDay(): number {
    const configured = environment.meetingDay;
    return Number.isInteger(configured) && configured >= 0 && configured <= 6
      ? configured
      : DEFAULT_MEETING_DAY;
  }

  /**
   * Human-readable description of the print range, e.g. "viernes a jueves".
   */
  getPrintRangeDescription(): string {
    const meetingDay = this.getMeetingDay();
    const startDay = (meetingDay + 1) % 7;
    return `${DAY_NAMES[startDay].toLowerCase()} a ${DAY_NAMES[meetingDay].toLowerCase()}`;
  }

  /**
   * Calculate the print range from a Monday-based weekId.
   *
   * The DB stores weeks as Mon–Sun. For printing we want the day after the
   * meeting through the next meeting day (inclusive). With a Thursday meeting,
   * given weekId "2026-04-20" (Monday Apr 20), the range is Fri Apr 24 – Thu Apr 30.
   *
   * The range always falls within the selected week and the following one,
   * so callers only need to fetch those two weeks.
   */
  getPrintWeekRange(weekId: string): PrintWeekRange {
    const monday = new Date(weekId + 'T12:00:00');
    const meetingDay = this.getMeetingDay();

    // Offset of the meeting day from Monday (Mon = 0 ... Sun = 6)
    const meetingOffset = (meetingDay + 6) % 7;

    const start = new Date(monday);
    start.setDate(monday.getDate() + meetingOffset + 1);

    const end = new Date(monday);
    end.setDate(monday.getDate() + meetingOffset + 7);

    const label = `${DAY_NAMES[start.getDay()]} ${start.getDate()} de ${MONTH_NAMES[start.getMonth()]} al ${DAY_NAMES[end.getDay()]} ${end.getDate()} de ${MONTH_NAMES[end.getMonth()]}`;

    return { start, end, label };
  }

  /**
   * Filter and reorder departures for the print week range.
   * Takes the selected week departures and the next week departures,
   * then picks only the dates that fall within the range.
   */
  getDeparturesForPrintWeek(
    currentWeekDepartures: Departure[],
    nextWeekDepartures: Departure[],
    weekId: string,
  ): Departure[] {
    const { start, end } = this.getPrintWeekRange(weekId);

    // Normalize dates for comparison (strip time)
    const startStr = this.dateToString(start);
    const endStr = this.dateToString(end);

    const allDepartures = [...currentWeekDepartures, ...nextWeekDepartures];

    return allDepartures
      .filter((dep) => {
        const depDate = dep.date; // Format: YYYY-MM-DD
        return depDate >= startStr && depDate <= endStr;
      })
      .sort(compareDeparturesByDateTime);
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
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const colors = this.getColors(rgb, mode);

    // Column widths — optimized for max readability
    const colWidths: ColWidths = {
      day: 80,
      schedule: 50,
      driver: 145,
      point: 145,
      territories: this.CONTENT_WIDTH - 80 - 50 - 145 - 145,
    };

    const page = pdfDoc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);

    // Sort group numbers
    const sortedGroups = [...groupNumbers].sort((a, b) => a - b);

    const ctx: PdfRenderContext = {
      pdfDoc,
      page,
      // Draw lightweight page header (ink-efficient)
      yPos: this.drawLightHeader(
        page,
        this.PAGE_HEIGHT - this.MARGIN,
        fontBold,
        fontRegular,
        colors,
        weekLabel,
      ),
      fontBold,
      fontRegular,
      fontItalic,
      colors,
      colWidths,
      showGroupHeaders: sortedGroups.length > 1,
    };

    sortedGroups.forEach((groupNum, gIdx) => {
      // Filter departures for this group
      const groupDepartures = departures.filter((dep) => dep.group === groupNum || dep.group === 0);
      if (groupDepartures.length === 0) return;

      this.renderGroupSection(ctx, groupNum, groupDepartures);

      // Spacing between groups
      if (gIdx < sortedGroups.length - 1) {
        ctx.yPos -= 8;
      }
    });

    // Draw footer on last page
    this.drawFooter(ctx.page, fontItalic, colors);

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  /**
   * Render one group's section: section header, table header and rows,
   * adding new pages as needed.
   */
  private renderGroupSection(
    ctx: PdfRenderContext,
    groupNum: number,
    groupDepartures: Departure[],
  ): void {
    // Group section header — check if enough space
    const groupHeaderHeight = ctx.showGroupHeaders ? 22 : 0;
    if (ctx.yPos - groupHeaderHeight - 20 < this.MARGIN + 20) {
      this.startNewPage(ctx);
    }

    this.drawGroupHeaders(ctx, groupNum);

    // Group departures by date
    const groupedByDate = this.groupDeparturesByDate(groupDepartures);

    for (const [, deps] of groupedByDate) {
      deps.forEach((dep, i) => {
        const rowHeight = this.estimateRowHeightCompact(dep, ctx.fontRegular, ctx.colWidths);

        // Check if we need a new page, re-drawing headers on it
        if (ctx.yPos - rowHeight < this.MARGIN + 15) {
          this.startNewPage(ctx);
          this.drawGroupHeaders(ctx, groupNum);
        }

        ctx.yPos = this.drawDepartureRowCompact(
          ctx.page,
          ctx.yPos,
          dep,
          i % 2 === 0,
          ctx.fontBold,
          ctx.fontRegular,
          ctx.colors,
          ctx.colWidths,
        );
      });
      // Small separator between days
      ctx.yPos -= 1;
    }
  }

  /** Close the current page with a footer and continue on a fresh one. */
  private startNewPage(ctx: PdfRenderContext): void {
    this.drawFooter(ctx.page, ctx.fontItalic, ctx.colors);
    ctx.page = ctx.pdfDoc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);
    ctx.yPos = this.PAGE_HEIGHT - this.MARGIN;
  }

  /** Draw the group section header (only for multiple groups) and the table header. */
  private drawGroupHeaders(ctx: PdfRenderContext, groupNum: number): void {
    if (ctx.showGroupHeaders) {
      ctx.yPos = this.drawGroupSectionHeader(
        ctx.page,
        ctx.yPos,
        ctx.fontBold,
        ctx.fontRegular,
        ctx.colors,
        groupNum,
      );
    }
    ctx.yPos = this.drawTableHeaderCompact(
      ctx.page,
      ctx.yPos,
      ctx.fontBold,
      ctx.colors,
      ctx.colWidths,
    );
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
    colors: ReturnType<typeof this.getColors>,
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
    colors: ReturnType<typeof this.getColors>,
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
    colors: ReturnType<typeof this.getColors>,
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
    colors: ReturnType<typeof this.getColors>,
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

  private drawFooter(
    page: PDFPage,
    fontItalic: PDFFont,
    colors: ReturnType<typeof this.getColors>,
  ): void {
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
