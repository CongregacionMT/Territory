import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { WeeklyDeparture } from '@core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { formatWeekRange } from '@shared/utils/date-utils';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-statistics-departures',
  imports: [RouterLink],
  templateUrl: './statistics-departures.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./statistics-departures.component.scss'],
})
export class StatisticsDeparturesComponent {
  private readonly territoryDataService = inject(TerritoryDataService);
  private readonly spinner = inject(SpinnerService);

  readonly weeklyDepartures = toSignal(
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

  readonly totalDeparturesCount = computed(() => {
    return this.weeklyDepartures().reduce(
      (acc, week) => acc + (week.departure ? week.departure.length : 0),
      0,
    );
  });

  // Estadísticas de conductores procesadas
  readonly driverStats = computed(() => {
    const driverCounts: Record<string, number> = {};
    const weeklyData = this.weeklyDepartures();
    let totalAssignments = 0;

    weeklyData.forEach((week) => {
      (week.departure || []).forEach((dep) => {
        if (dep.driver && dep.driver.trim() !== '') {
          const name = dep.driver.trim();
          driverCounts[name] = (driverCounts[name] || 0) + 1;
          totalAssignments += 1;
        }
      });
    });

    return Object.keys(driverCounts)
      .map((name) => ({
        name,
        count: driverCounts[name],
        percentage:
          totalAssignments > 0 ? Math.round((driverCounts[name] / totalAssignments) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  readonly maxDriverCount = computed(() => {
    const stats = this.driverStats();
    return stats.length > 0 ? stats[0].count : 1;
  });

  // Estadísticas de puntos de encuentro procesadas
  readonly pointStats = computed(() => {
    const pointsMap: Record<string, { lastDate: string; count: number }> = {};
    const weeklyData = this.weeklyDepartures();

    weeklyData.forEach((week) => {
      (week.departure || []).forEach((dep) => {
        if (dep.point && dep.point.trim() !== '') {
          const point = dep.point.trim();
          if (!pointsMap[point]) {
            pointsMap[point] = { lastDate: week.weekId, count: 1 };
          } else {
            pointsMap[point].count += 1;
            if (week.weekId > pointsMap[point].lastDate) {
              pointsMap[point].lastDate = week.weekId;
            }
          }
        }
      });
    });

    return Object.keys(pointsMap)
      .map((name) => ({
        name,
        lastDate: pointsMap[name].lastDate,
        count: pointsMap[name].count,
      }))
      .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate));
  });

  constructor() {
    this.spinner.cargarSpinner();
  }

  getFormattedDate(date: string): string {
    return formatWeekRange(date);
  }
}
