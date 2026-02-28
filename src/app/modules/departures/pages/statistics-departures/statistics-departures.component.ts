import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { WeeklyDeparture } from '@core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { formatWeekRange } from '@shared/utils/date-utils';

@Component({
  selector: 'app-statistics-departures',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent],
  templateUrl: './statistics-departures.component.html',
  styleUrls: ['./statistics-departures.component.scss'],
})
export class StatisticsDeparturesComponent implements OnInit {
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);

  weeklyDepartures: WeeklyDeparture[] = [];
  routerBreadcrum: any = [];

  // Estadísticas procesadas
  driverStats: { name: string; count: number }[] = [];
  pointStats: { name: string; lastDate: string }[] = [];

  ngOnInit(): void {
    console.log('Cargando StatisticsDeparturesComponent...');
    this.spinner.cargarSpinner();
    this.routerBreadcrum = this.routerBreadcrumMockService.getBreadcrum()[13]; // Home > Salidas > Estadísticas

    this.territoryDataService.getWeeklyDepartures().subscribe({
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
