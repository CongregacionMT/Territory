import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { FormBuilder, FormControl, FormsModule } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { NetworkService } from '@core/services/network.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { DeparturesCardsComponent } from '../../../../shared/components/departures-cards/departures-cards.component';
import { formatWeekRange, getMonday, getWeekId } from '@shared/utils/date-utils';
import { NgClass } from '@angular/common';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-departure-page',
  templateUrl: './departure-page.component.html',
  styleUrls: ['./departure-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DeparturesCardsComponent,
    RouterLink,
    FormsModule,
    NgClass,
  ],
})
export class DeparturePageComponent implements OnInit {
    private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);
  public networkService = inject(NetworkService);

  // Simple state
    numberGroup: any = '0';
  titleGroup = signal('');
  
  dateDeparture = new FormControl(getWeekId(new Date()));
  showHistory = signal(false);

  // Reactive state
  selectedWeekId = signal<string>(getWeekId(new Date()));
  isCurrentWeek = computed(() => this.selectedWeekId() === getWeekId(new Date()));

  // Data streams converted to Signals
  weeklyHistory = toSignal(this.territoryDataService.getWeeklyDepartures(), { initialValue: [] });

  departures$ = toSignal(
    toObservable(this.selectedWeekId).pipe(
      tap(() => this.spinner.cargarSpinner()),
      switchMap(weekId => 
        this.territoryDataService.getWeeklyDeparture(weekId).pipe(
          map((weeklyData: any) => {
            let deps = weeklyData?.departure || [];
            deps.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return deps;
          }),
          catchError(() => 
            this.territoryDataService.getDepartures().pipe(
              map((masterData: any) => {
                let deps = masterData?.departure || [];
                deps.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                return deps;
              }),
              catchError(() => of([]))
            )
          )
        )
      ),
      tap(() => {
        this.spinner.cerrarSpinner();
        if (!this.networkService.isOnline()) {
          setTimeout(() => this.spinner.cerrarSpinner(), 1500);
        }
      })
    ),
    { initialValue: [] }
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
          departure: []
        });
      }
    }
    return nextThreeWeeks;
  });

  constructor() {
    this.spinner.cargarSpinner();
        this.numberGroup = this.rutaActiva.snapshot.params;
    if (this.numberGroup.number !== '0') {
      this.titleGroup.set(`(Grupo ${this.numberGroup.number})`);
    }

    // Effect to keep FormControl in sync with signal for HTML compatibility
    effect(() => {
      this.dateDeparture.setValue(this.selectedWeekId(), { emitEvent: false });
    });
  }

  ngOnInit(): void {
    
    if (!this.networkService.isOnline()) {
      setTimeout(() => this.spinner.cerrarSpinner(), 1500);
    }
  }

  selectWeek(id: string) {
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
        icon: 'https://api.iconify.design/mdi:calendar-check.svg?color=%23ffffff',
      };
    } else if (diffWeeks === 1) {
      return {
        label: 'Semana próxima',
        badgeClass: 'badge-future-week',
        icon: 'https://api.iconify.design/mdi:calendar-arrow-right.svg?color=%23ffffff',
      };
    } else if (diffWeeks > 1) {
      return {
        label: `En ${diffWeeks} semanas`,
        badgeClass: 'badge-future-week',
        icon: 'https://api.iconify.design/mdi:calendar-arrow-right.svg?color=%23ffffff',
      };
    } else if (diffWeeks === -1) {
      return {
        label: 'La semana pasada',
        badgeClass: 'badge-past-week',
        icon: 'https://api.iconify.design/mdi:calendar-arrow-left.svg?color=%23ffffff',
      };
    } else {
      return {
        label: `Hace ${Math.abs(diffWeeks)} semanas`,
        badgeClass: 'badge-past-week',
        icon: 'https://api.iconify.design/mdi:calendar-arrow-left.svg?color=%23ffffff',
      };
    }
  }
}
