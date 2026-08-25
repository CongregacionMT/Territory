import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  Component,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
  signal,
  computed,
  effect,
  untracked,
} from '@angular/core';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Router, RouterLink } from '@angular/router';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { Group } from '@core/models/Group';
import { Departure, WeeklyDeparture, DepartureData } from '@core/models/Departures';
import { DeparturePdfService, PrintMode } from '@core/services/departure-pdf.service';
import { getWeekId } from '@shared/utils/date-utils';
import { forkJoin, take, tap } from 'rxjs';

@Component({
  selector: 'app-home-departure-page',
  templateUrl: './home-departure-page.component.html',
  styleUrls: ['./home-departure-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardXlComponent, RouterLink],
})
export class HomeDeparturePageComponent {
  private destroyRef = inject(DestroyRef);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private pdfService = inject(DeparturePdfService);

  isAdmin: boolean = false;

  groups = toSignal(
    this.territoryDataService.getGroupList().pipe(tap(() => this.spinner.cerrarSpinner())),
    { initialValue: [] as Group[] },
  );

  groupKeys = computed(() => {
    const groupData = this.groups();
    const keys: { name: string; src: string; link: string; number: number }[] = [];

    if (groupData && groupData.length > 0) {
      const sortedGroups = [...groupData].sort((a, b) => {
        const numA = parseInt(a.id.replace('Grupo ', '')) || 0;
        const numB = parseInt(b.id.replace('Grupo ', '')) || 0;
        return numA - numB;
      });

      sortedGroups.forEach((group) => {
        const groupNum = parseInt(group.id.replace('Grupo ', '')) || 0;
        keys.push({
          name: group.id,
          src: '../../../assets/img/group.png',
          link: `grupo/${groupNum}`,
          number: groupNum,
        });
      });
    } else {
      keys.push({
        name: 'Salidas generales',
        src: '../../../assets/img/group.png',
        link: `grupo/0`,
        number: 0,
      });
    }

    return keys;
  });

  // Print state
  showPrintModal = signal(false);
  isPrintingPdf = signal(false);
  pdfGenerated = signal(false);

  constructor() {
    this.isAdmin = !!localStorage.getItem('tokenAdmin');
    this.spinner.cargarSpinner();

    effect(() => {
      const keys = this.groupKeys();
      if (keys.length === 1 && !this.isAdmin && !sessionStorage.getItem('redirectedToGroup0')) {
        sessionStorage.setItem('redirectedToGroup0', 'true');
        const targetLink = keys[0].link;
        untracked(() => {
          setTimeout(() => {
            void this.router.navigate(['/salidas/' + targetLink]);
          });
        });
      }
    });
  }

  // ==========================================
  // Print functionality (all groups)
  // ==========================================

  openPrintModal(): void {
    this.showPrintModal.set(true);
    this.pdfGenerated.set(false);
  }

  closePrintModal(): void {
    this.showPrintModal.set(false);
  }

  printPdf(mode: PrintMode): void {
    this.isPrintingPdf.set(true);
    this.pdfGenerated.set(false);

    try {
      const currentWeekId = getWeekId(new Date());
      const nextWeekId = this.pdfService.getNextWeekId(currentWeekId);
      const printRange = this.pdfService.getPrintWeekRange(currentWeekId);

      // Fetch current week and next week departures
      forkJoin({
        current: this.territoryDataService.getWeeklyDeparture(currentWeekId).pipe(take(1)),
        next: this.territoryDataService.getWeeklyDeparture(nextWeekId).pipe(take(1)),
        master: this.territoryDataService.getDepartures().pipe(take(1)),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result: {
            current?: WeeklyDeparture;
            next?: WeeklyDeparture;
            master?: DepartureData;
          }): void => {
            void (async (): Promise<void> => {
              try {
                let currentDepartures: Departure[] = [];
                let nextDepartures: Departure[] = [];

                if (result.current?.departure && result.current.departure.length > 0) {
                  currentDepartures = result.current.departure;
                } else if (result.master?.departure && result.master.departure.length > 0) {
                  currentDepartures = result.master.departure;
                }

                if (result.next?.departure && result.next.departure.length > 0) {
                  nextDepartures = result.next.departure;
                }

                const printDepartures = this.pdfService.getDeparturesForPrintWeek(
                  currentDepartures,
                  nextDepartures,
                  currentWeekId,
                );

                const groupNumbers = this.groupKeys().map((g) => g.number);

                const pdfBytes = await this.pdfService.generateAllGroupsPdf(
                  printDepartures,
                  printRange.label,
                  mode,
                  groupNumbers,
                );

                const modeLabel = mode === 'color' ? 'color' : 'bn';
                const filename = `salidas_${currentWeekId}_todos_${modeLabel}.pdf`;
                this.pdfService.downloadPdf(pdfBytes, filename);

                this.isPrintingPdf.set(false);
                this.pdfGenerated.set(true);

                setTimeout(() => {
                  this.showPrintModal.set(false);
                  this.pdfGenerated.set(false);
                }, 3000);
              } catch (error) {
                console.error('Error generating PDF:', error);
              } finally {
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
