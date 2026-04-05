import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { DeparturesCardsComponent } from '../../../../shared/components/departures-cards/departures-cards.component';
import { FormsModule } from '@angular/forms';
import { formatWeekRange, getWeekId } from '@shared/utils/date-utils';

@Component({
  selector: 'app-departure-page',
  templateUrl: './departure-page.component.html',
  styleUrls: ['./departure-page.component.scss'],
  imports: [
    BreadcrumbComponent,
    DeparturesCardsComponent,
    RouterLink,
    FormsModule,
  ],
})
export class DeparturePageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private fb = inject(FormBuilder);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);

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
  }

  loadHistory() {
    this.territoryDataService.getWeeklyDepartures().subscribe((history) => {
      this.weeklyHistory = history;
      
      const today = new Date();
      const currentWeekId = getWeekId(today);

      this.futureWeeks = history
        .filter((w) => w.weekId > currentWeekId)
        .sort((a, b) => a.weekId.localeCompare(b.weekId));

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

    this.territoryDataService.getWeeklyDeparture(currentWeekId).subscribe({
      next: (weeklyData: any) => {
        if (weeklyData?.departure?.length > 0) {
          this.departures$ = weeklyData.departure;
          this.sortDepartures();
          this.spinner.cerrarSpinner();
        } else {
          // Fallback a las salidas "master" si no hay historial guardado para esta semana todavía
          this.territoryDataService.getDepartures().subscribe({
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
        this.territoryDataService.getDepartures().subscribe({
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
    this.selectedWeek = id;
    this.showHistory = false;
    this.spinner.cargarSpinner();

    if (this.selectedWeek === 'actual') {
      this.loadCurrentWeek();
      return;
    }

    const historyRecord = this.weeklyHistory.find(
      (w) => w.id === this.selectedWeek,
    );

    if (historyRecord) {
      this.departures$ = historyRecord.departure;
      this.sortDepartures();
      this.dateDeparture.setValue(historyRecord.weekId);
    }
    this.spinner.cerrarSpinner();
  }

  getFormattedDate(date: string): string {
    return formatWeekRange(date);
  }
}
