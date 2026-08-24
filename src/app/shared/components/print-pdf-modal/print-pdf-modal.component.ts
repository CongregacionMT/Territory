import {
  Component,
  Output,
  EventEmitter,
  Input,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeparturePdfService, PrintMode } from '@core/services/departure-pdf.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { getWeekId } from '@shared/utils/date-utils';
import { Departure } from '@core/models/Departures';
import { forkJoin, take } from 'rxjs';

@Component({
  selector: 'app-print-pdf-modal',
  templateUrl: './print-pdf-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class PrintPdfModalComponent {
  private pdfService = inject(DeparturePdfService);
  private territoryDataService = inject(TerritoryDataService);
  private destroyRef = inject(DestroyRef);

  @Input() groupNumbers: number[] = [];
  @Output() close = new EventEmitter<void>();

  isPrintingPdf = signal<boolean>(false);
  pdfGenerated = signal<boolean>(false);

  closeModal(): void {
    this.close.emit();
  }

  async printPdf(mode: PrintMode): Promise<void> {
    this.isPrintingPdf.set(true);
    this.pdfGenerated.set(false);

    try {
      const currentWeekId = getWeekId(new Date());
      const nextWeekId = this.pdfService.getNextWeekId(currentWeekId);
      const printRange = this.pdfService.getPrintWeekRange(currentWeekId);

      forkJoin({
        current: this.territoryDataService.getWeeklyDeparture(currentWeekId).pipe(take(1)),
        next: this.territoryDataService.getWeeklyDeparture(nextWeekId).pipe(take(1)),
        master: this.territoryDataService.getDepartures().pipe(take(1)),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: async (result: unknown) => {
            try {
              let currentDepartures: Departure[] = [];
              let nextDepartures: Departure[] = [];

              if (result.current?.departure?.length > 0) {
                currentDepartures = result.current.departure;
              } else if (result.master?.departure?.length > 0) {
                currentDepartures = result.master.departure;
              }

              if (result.next?.departure?.length > 0) {
                nextDepartures = result.next.departure;
              }

              const printDepartures = this.pdfService.getDeparturesForPrintWeek(
                currentDepartures,
                nextDepartures,
                currentWeekId,
              );

              const pdfBytes = await this.pdfService.generateAllGroupsPdf(
                printDepartures,
                printRange.label,
                mode,
                this.groupNumbers,
              );

              const modeLabel = mode === 'color' ? 'color' : 'bn';
              const filename = `salidas_${currentWeekId}_todos_${modeLabel}.pdf`;
              this.pdfService.downloadPdf(pdfBytes, filename);

              this.isPrintingPdf.set(false);
              this.pdfGenerated.set(true);

              setTimeout(() => {
                this.pdfGenerated.set(false);
                this.closeModal();
              }, 3000);
            } catch (error) {
              console.error('Error generating PDF:', error);
              this.isPrintingPdf.set(false);
            }
          },
          error: (error: unknown) => {
            console.error('Error fetching departures for PDF:', error);
            this.isPrintingPdf.set(false);
          },
        });
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.isPrintingPdf.set(false);
    }
  }
}
