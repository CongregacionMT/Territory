import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { NetworkService } from '@core/services/network.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { DeparturesCardsComponent } from '../../../../shared/components/departures-cards/departures-cards.component';
import { FormsModule } from '@angular/forms';
import { formatWeekRange, getMonday, getWeekId } from '@shared/utils/date-utils';
import { Subscription } from 'rxjs';

import { NgClass } from '@angular/common';

@Component({
  selector: 'app-departure-page',
  templateUrl: './departure-page.component.html',
  styleUrls: ['./departure-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    BreadcrumbComponent,
    DeparturesCardsComponent,
    RouterLink,
    FormsModule,
    NgClass,
  ],
})
export class DeparturePageComponent implements OnInit, OnDestroy {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private fb = inject(FormBuilder);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);
  public networkService = inject(NetworkService);

  routerBreadcrum: any = [];
  numberGroup: any = '0';
  titleGroup: string = '';
  dateDeparture: any = new FormControl('');
  departures$: Departure[] = [];
  weeklyHistory: WeeklyDeparture[] = [];
  pastWeeks: WeeklyDeparture[] = [];
  futureWeeks: WeeklyDeparture[] = [];
  selectedWeek: string = 'actual';
  showHistory: boolean = false;
  private dataSub?: Subscription;
  private fallbackSub?: Subscription;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.numberGroup = this.rutaActiva.snapshot.params;
    this.titleGroup =
      this.numberGroup.number !== '0'
        ? `(Grupo ${this.numberGroup.number})`
        : '';
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[10];
    this.loadHistory();
    this.loadCurrentWeek();

    // Si estamos offline y firebase se queda colgado sin caché,
    // forzamos el cierre del spinner después de un breve delay.
    if (!this.networkService.isOnline()) {
      setTimeout(() => {
        this.spinner.cerrarSpinner();
      }, 1500);
    }
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }

  private cleanupSubscriptions(): void {
    if (this.dataSub) {
      this.dataSub.unsubscribe();
      this.dataSub = undefined;
    }
    if (this.fallbackSub) {
      this.fallbackSub.unsubscribe();
      this.fallbackSub = undefined;
    }
  }

  loadHistory() {
    this.territoryDataService.getWeeklyDepartures().subscribe((history) => {
      this.weeklyHistory = history;
      
      const today = new Date();
      const currentWeekId = getWeekId(today);

      // Filtrar semanas futuras existentes en la base de datos
      const existingFutureWeeks = history
        .filter((w) => w.weekId > currentWeekId)
        .sort((a, b) => a.weekId.localeCompare(b.weekId));

      // Generar las próximas 3 semanas a partir de la fecha actual
      const nextThreeWeeks: WeeklyDeparture[] = [];
      const mondayCurrent = getMonday(today);

      for (let i = 1; i <= 3; i++) {
        const nextMonday = new Date(mondayCurrent);
        nextMonday.setDate(mondayCurrent.getDate() + i * 7);
        const weekId = getWeekId(nextMonday);

        // Si la semana ya existe en Firebase, usamos ese registro. Si no, creamos un item virtual para seleccionar.
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

      this.futureWeeks = nextThreeWeeks;

      this.pastWeeks = history
        .filter((w) => w.weekId < currentWeekId)
        .sort((a, b) => b.weekId.localeCompare(a.weekId));
    });
  }

  loadCurrentWeek() {
    this.selectedWeek = 'actual';

    // Calcular el lunes de la semana actual
    const today = new Date();
    const currentWeekId = getWeekId(today);

    this.dateDeparture.setValue(currentWeekId);
    this.departures$ = [];
    this.spinner.cargarSpinner();

    this.cleanupSubscriptions();

    this.dataSub = this.territoryDataService.getWeeklyDeparture(currentWeekId).subscribe({
      next: (weeklyData: any) => {
        if (weeklyData?.departure?.length > 0) {
          this.departures$ = weeklyData.departure;
          this.sortDepartures();
          this.spinner.cerrarSpinner();
        } else {
          // Fallback a las salidas "master" si no hay historial guardado para esta semana todavía
          if (this.fallbackSub) {
            this.fallbackSub.unsubscribe();
          }
          this.fallbackSub = this.territoryDataService.getDepartures().subscribe({
            next: (masterData: any) => {
              this.departures$ = masterData?.departure || [];
              this.sortDepartures();
              this.spinner.cerrarSpinner();
            },
            error: () => {
              this.departures$ = [];
              this.spinner.cerrarSpinner();
            },
          });
        }
      },
      error: () => {
        // En caso de error, intentar fallback también
        if (this.fallbackSub) {
          this.fallbackSub.unsubscribe();
        }
        this.fallbackSub = this.territoryDataService.getDepartures().subscribe({
          next: (masterData: any) => {
            this.departures$ = masterData?.departure || [];
            this.sortDepartures();
            this.spinner.cerrarSpinner();
          },
          error: () => {
            this.departures$ = [];
            this.spinner.cerrarSpinner();
          },
        });
      },
    });
  }

  sortDepartures() {
    this.departures$.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }

  selectWeek(id: string) {
    this.showHistory = false;

    if (id === 'actual') {
      this.loadCurrentWeek();
      return;
    }

    let weekId = id;
    if (id.startsWith('virtual-')) {
      weekId = id.replace('virtual-', '');
    } else {
      const historyRecord = this.weeklyHistory.find((w) => w.id === id || w.weekId === id);
      if (historyRecord) {
        weekId = historyRecord.weekId;
      }
    }

    this.loadWeekByWeekId(weekId);
  }

  getFormattedDate(date: string): string {
    return formatWeekRange(date);
  }

  navigateWeek(direction: number): void {
    const val = this.dateDeparture.value;
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

    const targetWeekId = getWeekId(targetMonday);
    this.loadWeekByWeekId(targetWeekId);
  }

  loadWeekByWeekId(targetWeekId: string): void {
    const currentWeekId = getWeekId(new Date());

    if (targetWeekId === currentWeekId) {
      this.loadCurrentWeek();
      return;
    }

    this.spinner.cargarSpinner();
    this.selectedWeek = targetWeekId;
    this.dateDeparture.setValue(targetWeekId);
    this.departures$ = [];

    this.cleanupSubscriptions();

    this.dataSub = this.territoryDataService.getWeeklyDeparture(targetWeekId).subscribe({
      next: (weeklyData: any) => {
        if (weeklyData?.departure?.length > 0) {
          this.departures$ = weeklyData.departure;
          this.sortDepartures();
        } else {
          this.departures$ = [];
        }
        this.spinner.cerrarSpinner();
      },
      error: (err) => {
        console.error('Error al cargar semana:', err);
        this.departures$ = [];
        this.spinner.cerrarSpinner();
      },
    });

    if (!this.networkService.isOnline()) {
      setTimeout(() => {
        this.spinner.cerrarSpinner();
      }, 1500);
    }
  }

  getRelativeWeekInfo(): { label: string; badgeClass: string; icon: string } {
    const val = this.dateDeparture.value;
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
