import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { WeeklyDeparture } from '@core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { formatWeekRange } from '@shared/utils/date-utils';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-statistics-departures',
  standalone: true,
  imports: [],
  templateUrl: './statistics-departures.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./statistics-departures.component.scss'],
})
export class StatisticsDeparturesComponent {
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  weeklyDepartures = toSignal(
    this.territoryDataService.getWeeklyDepartures().pipe(
      tap(() => this.spinner.cerrarSpinner()),
      catchError((err) => {
        console.error('Error loading weekly departures for stats:', err);
        this.spinner.cerrarSpinner();
        return of([] as WeeklyDeparture[]);
      }),
    ),
    { initialValue: [] as WeeklyDeparture[] },
  );

  // Estadísticas procesadas (computed)
  driverStats = computed(() => {
    const driverCounts: { [key: string]: number } = {};
    const weeklyData = this.weeklyDepartures();

    weeklyData.forEach((week) => {
      week.departure.forEach((dep) => {
        if (dep.driver) {
          driverCounts[dep.driver] = (driverCounts[dep.driver] || 0) + 1;
        }
      });
    });

    return Object.keys(driverCounts)
      .map((name) => ({ name, count: driverCounts[name] }))
      .sort((a, b) => b.count - a.count);
  });

  pointStats = computed(() => {
    const pointsMap: { [key: string]: string } = {};
    const weeklyData = this.weeklyDepartures();

    weeklyData.forEach((week) => {
      week.departure.forEach((dep) => {
        if (dep.point) {
          if (!pointsMap[dep.point]) {
            pointsMap[dep.point] = week.weekId;
          }
        }
      });
    });

    return Object.keys(pointsMap)
      .map((name) => ({ name, lastDate: pointsMap[name] }))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  });

  constructor() {
    this.spinner.cargarSpinner();
  }

  getFormattedDate(date: string): string {
    return formatWeekRange(date);
  }
}
