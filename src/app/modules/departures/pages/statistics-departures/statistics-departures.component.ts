import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectionStrategy , DestroyRef} from '@angular/core';

import { TerritoryDataService } from '@core/services/territory-data.service';
import { WeeklyDeparture } from '@core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { formatWeekRange } from '@shared/utils/date-utils';

@Component({
  selector: 'app-statistics-departures',
  standalone: true,
  imports: [],
  templateUrl: './statistics-departures.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./statistics-departures.component.scss'],
})
export class StatisticsDeparturesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  weeklyDepartures: WeeklyDeparture[] = [];

  // Estadísticas procesadas
  driverStats: { name: string; count: number }[] = [];
  pointStats: { name: string; lastDate: string }[] = [];

  ngOnInit(): void {
    console.log('Cargando StatisticsDeparturesComponent...');
    this.spinner.cargarSpinner();

    this.territoryDataService.getWeeklyDepartures().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.weeklyDepartures = data;
        this.processStats();
        this.spinner.cerrarSpinner();
      },
      error: () => this.spinner.cerrarSpinner(),
    });
  }

  processStats() {
    const driverCounts: { [key: string]: number } = {};
    const pointsMap: { [key: string]: string } = {};

    this.weeklyDepartures.forEach((week) => {
      week.departure.forEach((dep) => {
        if (dep.driver) {
          driverCounts[dep.driver] = (driverCounts[dep.driver] || 0) + 1;
        }
        if (dep.point) {
          // Guardamos la fecha más reciente (como están ordenadas por weekId desc, la primera que encontremos es la más reciente del historial)
          if (!pointsMap[dep.point]) {
            pointsMap[dep.point] = week.weekId;
          }
        }
      });
    });

    this.driverStats = Object.keys(driverCounts)
      .map((name) => ({ name, count: driverCounts[name] }))
      .sort((a, b) => b.count - a.count);

    this.pointStats = Object.keys(pointsMap)
      .map((name) => ({ name, lastDate: pointsMap[name] }))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }

  getFormattedDate(date: string): string {
    return formatWeekRange(date);
  }
}
