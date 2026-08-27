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
  private readonly pdfService = inject(DeparturePdfService);
  private readonly territoryDataService = inject(TerritoryDataService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() groupNumbers: number[] = [];
  @Output() closeModalEvent = new EventEmitter<void>();

  isPrintingPdf = signal<boolean>(false);
  pdfGenerated = signal<boolean>(false);

  closeModal(): void {
    this.closeModalEvent.emit();
  }

  printPdf(mode: PrintMode): void {
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
          next: (result: {
            current: { departure?: Departure[] } | null;
            next: { departure?: Departure[] } | null;
            master: { departure?: Departure[] } | null;
          }) => {
            void (async (): Promise<void> => {
              try {
                let currentDepartures: Departure[] = [];
                let nextDepartures: Departure[] = [];

                if (result.current?.departure?.length) {
                  currentDepartures = result.current.departure;
                } else if (result.master?.departure?.length) {
                  currentDepartures = result.master.departure;
                }

                if (result.next?.departure?.length) {
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
            })();
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
