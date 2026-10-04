import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { NetworkService } from '@core/services/network.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WeeklyDeparture, DepartureData } from '@core/models/Departures';
import { NgClass } from '@angular/common';
import { DeparturesCardsComponent } from '../../../../shared/components/departures-cards/departures-cards.component';
import { formatWeekRange, getMonday, getWeekId } from '@shared/utils/date-utils';
import { sortDeparturesByDateTime } from '@shared/utils/departure-sort.utils';

import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of, concat } from 'rxjs';

@Component({
  selector: 'app-departure-page',
  templateUrl: './departure-page.component.html',
  styleUrls: ['./departure-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DeparturesCardsComponent, RouterLink, NgClass, FormsModule],
})
export class DeparturePageComponent {
  private readonly territoryDataService = inject(TerritoryDataService);
  private readonly rutaActiva = inject(ActivatedRoute);
  public networkService = inject(NetworkService);

  // Simple state
  numberGroup: Record<string, string> | string = '0';
  titleGroup = signal('');

  dateDeparture = new FormControl(getWeekId(new Date()));
  showHistory = signal(false);

  // Reactive state
  selectedWeekId = signal<string>(getWeekId(new Date()));
  isCurrentWeek = computed(() => this.selectedWeekId() === getWeekId(new Date()));

  // Data streams converted to Signals
  weeklyHistory = toSignal(this.territoryDataService.getWeeklyDepartures(15), { initialValue: [] });

  departures$ = toSignal(
    toObservable(this.selectedWeekId).pipe(
      switchMap((weekId) =>
        concat(
          of(undefined),
          this.territoryDataService.getWeeklyDeparture(weekId).pipe(
            map((weeklyData: WeeklyDeparture | undefined) =>
              sortDeparturesByDateTime(weeklyData?.departure ?? []),
            ),
            catchError(() =>
              this.territoryDataService.getDepartures().pipe(
                map((masterData: DepartureData | undefined) =>
                  sortDeparturesByDateTime(masterData?.departure ?? []),
                ),
                catchError(() => of([])),
              ),
            ),
          ),
        ),
      ),
    ),
    { initialValue: undefined },
  );

  pastWeeks = computed(() => {
    const history = this.weeklyHistory();
    const currentWeekId = getWeekId(new Date());
    return history
      .filter((w) => w.weekId < currentWeekId)
      .sort((a, b) => b.weekId.localeCompare(a.weekId));
  });

  futureWeeks = computed(() => {
    const history = this.weeklyHistory();
    const currentWeekId = getWeekId(new Date());
    const existingFutureWeeks = history
      .filter((w) => w.weekId > currentWeekId)
      .sort((a, b) => a.weekId.localeCompare(b.weekId));

    const nextThreeWeeks: WeeklyDeparture[] = [];
    const mondayCurrent = getMonday(new Date());

    for (let i = 1; i <= 3; i++) {
      const nextMonday = new Date(mondayCurrent);
      nextMonday.setDate(mondayCurrent.getDate() + i * 7);
      const weekId = getWeekId(nextMonday);

      const match = existingFutureWeeks.find((w) => w.weekId === weekId);
      if (match) {
        nextThreeWeeks.push(match);
      } else {
        nextThreeWeeks.push({
          id: `virtual-${weekId}`,
          weekId: weekId,
          departure: [],
        });
      }
    }
    return nextThreeWeeks;
  });

  constructor() {
    this.numberGroup = this.rutaActiva.snapshot.params;
    if (this.numberGroup['number'] && this.numberGroup['number'] !== '0') {
      this.titleGroup.set(`(Grupo ${this.numberGroup['number']})`);
    }

    // Effect to keep FormControl in sync with signal for HTML compatibility
    effect(() => {
      this.dateDeparture.setValue(this.selectedWeekId(), { emitEvent: false });
    });
  }

  selectWeek(id: string): void {
    this.showHistory.set(false);

    if (id === 'actual') {
      this.selectedWeekId.set(getWeekId(new Date()));
      return;
    }

    let weekId = id;
    if (id.startsWith('virtual-')) {
      weekId = id.replace('virtual-', '');
    } else {
      const historyRecord = this.weeklyHistory().find((w) => w.id === id || w.weekId === id);
      if (historyRecord) {
        weekId = historyRecord.weekId;
      }
    }

    this.selectedWeekId.set(weekId);
  }

  getFormattedDate(date: string): string {
    return formatWeekRange(date);
  }

  navigateWeek(direction: number): void {
    const val = this.selectedWeekId();
    let baseDate: Date;

    if (!val || val === 'actual') {
      baseDate = new Date();
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      baseDate = new Date(val + 'T12:00:00');
    } else {
      baseDate = new Date();
    }

    const currentMonday = getMonday(baseDate);
    const targetMonday = new Date(currentMonday);
    targetMonday.setDate(currentMonday.getDate() + direction * 7);

    this.selectedWeekId.set(getWeekId(targetMonday));
  }

  getRelativeWeekInfo(): { label: string; badgeClass: string; icon: string } {
    const val = this.selectedWeekId();
    let selectedDate: Date;

    if (!val || val === 'actual') {
      selectedDate = new Date();
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      selectedDate = new Date(val + 'T12:00:00');
    } else {
      selectedDate = new Date();
    }

    const currentMonday = getMonday(new Date());
    const selectedMonday = getMonday(selectedDate);

    const diffTime = selectedMonday.getTime() - currentMonday.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    const diffWeeks = Math.round(diffDays / 7);

    if (diffWeeks === 0) {
      return {
        label: 'Esta semana',
        badgeClass: 'badge-current-week',
        icon: 'assets/icons/ui/mdi-calendar-check-ffffff.svg',
      };
    } else if (diffWeeks === 1) {
      return {
        label: 'Semana próxima',
        badgeClass: 'badge-future-week',
        icon: 'assets/icons/ui/mdi-calendar-arrow-right-ffffff.svg',
      };
    } else if (diffWeeks > 1) {
      return {
        label: `En ${diffWeeks} semanas`,
        badgeClass: 'badge-future-week',
        icon: 'assets/icons/ui/mdi-calendar-arrow-right-ffffff.svg',
      };
    } else if (diffWeeks === -1) {
      return {
        label: 'La semana pasada',
        badgeClass: 'badge-past-week',
        icon: 'assets/icons/ui/mdi-calendar-arrow-left-ffffff.svg',
      };
    } else {
      return {
        label: `Hace ${Math.abs(diffWeeks)} semanas`,
        badgeClass: 'badge-past-week',
        icon: 'assets/icons/ui/mdi-calendar-arrow-left-ffffff.svg',
      };
    }
  }
}
