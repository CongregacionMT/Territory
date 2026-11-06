import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { NgClass } from '@angular/common';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { DeparturesStoreService } from '@core/services/departures-store.service';
import { Router, RouterLink } from '@angular/router';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';

import { Departure, WeeklyDeparture, DepartureData } from '@core/models/Departures';
import { DeparturePdfService, PrintMode } from '@core/services/departure-pdf.service';
import { getMonday, getWeekId } from '@shared/utils/date-utils';
import { forkJoin, take } from 'rxjs';

@Component({
  selector: 'app-home-departure-page',
  templateUrl: './home-departure-page.component.html',
  styleUrls: ['./home-departure-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardXlComponent, RouterLink, NgClass],
})
export class HomeDeparturePageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly territoryDataService = inject(TerritoryDataService);
  private readonly departuresStore = inject(DeparturesStoreService);
  private readonly router = inject(Router);
  private readonly pdfService = inject(DeparturePdfService);

  isAdmin: boolean = false;

  groups = this.departuresStore.groups;
  weeklyHistory = this.departuresStore.weeklyHistory;

  groupKeys = computed(() => {
    const groupData = this.groups();
    const keys: { name: string; src: string; link: string; number: number }[] = [];

    if (groupData === undefined) return keys;

    if (groupData && groupData.length > 0) {
      const sortedGroups = [...groupData].sort((a, b) => {
        const numA = Number.parseInt(a.id.replace('Grupo ', '')) || 0;
        const numB = Number.parseInt(b.id.replace('Grupo ', '')) || 0;
        return numA - numB;
      });

      sortedGroups.forEach((group) => {
        const groupNum = Number.parseInt(group.id.replace('Grupo ', '')) || 0;
        keys.push({
          name: sortedGroups.length === 1 ? 'Salidas generales' : group.id,
          src: '../../../assets/img/group.png',
          link: sortedGroups.length === 1 ? 'grupo/0' : `grupo/${groupNum}`,
          number: sortedGroups.length === 1 ? 0 : groupNum,
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
  selectedPrintWeekId = signal<string>(getWeekId(new Date()));
  readonly printRangeDescription = this.pdfService.getPrintRangeDescription();

  currentWeekOption = computed(() => {
    const weekId = getWeekId(new Date());
    const range = this.pdfService.getPrintWeekRange(weekId);
    return {
      weekId,
      label: range.label,
      relLabel: 'Semana actual',
    };
  });

  futureWeeks = computed(() => {
    const history = this.weeklyHistory();
    const currentWeek = getWeekId(new Date());
    const weeksMap = new Map<string, { weekId: string; label: string; relLabel: string }>();

    const existingFutureWeeks = (history || [])
      .filter((w) => Boolean(w?.weekId) && w.weekId > currentWeek)
      .sort((a, b) => a.weekId.localeCompare(b.weekId));

    for (const w of existingFutureWeeks) {
      const range = this.pdfService.getPrintWeekRange(w.weekId);
      const relLabel = this.getRelativeWeekLabel(w.weekId, currentWeek);
      weeksMap.set(w.weekId, { weekId: w.weekId, label: range.label, relLabel });
    }

    const currentMonday = getMonday(new Date());
    for (let i = 1; i <= 3; i++) {
      const nextMonday = new Date(currentMonday);
      nextMonday.setDate(currentMonday.getDate() + i * 7);
      const futureId = getWeekId(nextMonday);
      if (!weeksMap.has(futureId)) {
        const range = this.pdfService.getPrintWeekRange(futureId);
        const relLabel = this.getRelativeWeekLabel(futureId, currentWeek);
        weeksMap.set(futureId, { weekId: futureId, label: range.label, relLabel });
      }
    }

    return Array.from(weeksMap.values()).sort((a, b) => a.weekId.localeCompare(b.weekId));
  });

  pastWeeks = computed(() => {
    const history = this.weeklyHistory();
    const currentWeek = getWeekId(new Date());

    const past = (history || [])
      .filter((w) => Boolean(w?.weekId) && w.weekId < currentWeek)
      .sort((a, b) => b.weekId.localeCompare(a.weekId));

    return past.map((w) => {
      const range = this.pdfService.getPrintWeekRange(w.weekId);
      const relLabel = this.getRelativeWeekLabel(w.weekId, currentWeek);
      return {
        weekId: w.weekId,
        label: range.label,
        relLabel,
      };
    });
  });

  selectedWeekRangeLabel = computed(() => {
    const weekId = this.selectedPrintWeekId();
    if (!weekId) return '';
    return this.pdfService.getPrintWeekRange(weekId).label;
  });

  selectedWeekRelLabel = computed(() => {
    const weekId = this.selectedPrintWeekId();
    const currentWeek = getWeekId(new Date());
    return this.getRelativeWeekLabel(weekId, currentWeek);
  });

  selectedWeekBadgeClass = computed(() => {
    const weekId = this.selectedPrintWeekId();
    const currentWeek = getWeekId(new Date());
    if (weekId === currentWeek) {
      return 'bg-blue-900/60 text-blue-300 border border-blue-700/50';
    }
    if (weekId > currentWeek) {
      return 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50';
    }
    return 'bg-slate-700/80 text-slate-300 border border-slate-600';
  });

  isCustomWeekSelected = computed(() => {
    const sel = this.selectedPrintWeekId();
    const current = getWeekId(new Date());
    if (sel === current) return false;
    const inFuture = this.futureWeeks().some((w) => w.weekId === sel);
    const inPast = this.pastWeeks().some((w) => w.weekId === sel);
    return !inFuture && !inPast;
  });

  constructor() {
    this.departuresStore.connect();
    this.isAdmin = !!localStorage.getItem('tokenAdmin');

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
    this.selectedPrintWeekId.set(getWeekId(new Date()));
    this.showPrintModal.set(true);
    this.pdfGenerated.set(false);
  }

  closePrintModal(): void {
    this.showPrintModal.set(false);
  }

  navigatePrintWeek(direction: number): void {
    const currentSel = this.selectedPrintWeekId();
    const baseDate = new Date(currentSel + 'T12:00:00');
    const monday = getMonday(baseDate);
    monday.setDate(monday.getDate() + direction * 7);
    this.selectedPrintWeekId.set(getWeekId(monday));
  }

  onPrintWeekSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select?.value) {
      this.selectedPrintWeekId.set(select.value);
    }
  }

  private getRelativeWeekLabel(weekId: string, currentWeekId: string): string {
    if (weekId === currentWeekId) return 'Semana actual';
    const curDate = new Date(currentWeekId + 'T12:00:00');
    const targetDate = new Date(weekId + 'T12:00:00');
    const diffDays = Math.round((targetDate.getTime() - curDate.getTime()) / (1000 * 3600 * 24));
    const diffWeeks = Math.round(diffDays / 7);

    if (diffWeeks === 1) return 'Semana próxima';
    if (diffWeeks > 1) return `En ${diffWeeks} semanas`;
    if (diffWeeks === -1) return 'La semana pasada';
    return `Hace ${Math.abs(diffWeeks)} semanas`;
  }

  printPdf(mode: PrintMode): void {
    this.isPrintingPdf.set(true);
    this.pdfGenerated.set(false);

    try {
      const selectedWeekId = this.selectedPrintWeekId();
      const nextWeekId = this.pdfService.getNextWeekId(selectedWeekId);
      const printRange = this.pdfService.getPrintWeekRange(selectedWeekId);

      // Fetch selected week and next week departures
      forkJoin({
        current: this.territoryDataService.getWeeklyDeparture(selectedWeekId).pipe(take(1)),
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
                  selectedWeekId,
                );

                const groupNumbers = this.groupKeys().map((g) => g.number);

                const pdfBytes = await this.pdfService.generateAllGroupsPdf(
                  printDepartures,
                  printRange.label,
                  mode,
                  groupNumbers,
                );

                const modeLabel = mode === 'color' ? 'color' : 'bn';
                const filename = `salidas_${selectedWeekId}_todos_${modeLabel}.pdf`;
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
