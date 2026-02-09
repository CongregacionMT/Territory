import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DateDeparture, Departure, DepartureData, WeeklyDeparture } from '@core/models/Departures';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { DeparturesCardsComponent } from '../../../../shared/components/departures-cards/departures-cards.component';
import { FormsModule } from '@angular/forms';
import { formatWeekRange, getWeekId } from '@shared/utils/date-utils';

@Component({
    selector: 'app-departure-page',
    templateUrl: './departure-page.component.html',
    styleUrls: ['./departure-page.component.scss'],
    imports: [BreadcrumbComponent, DeparturesCardsComponent, RouterLink, FormsModule]
})
export class DeparturePageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private fb = inject(FormBuilder);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);

  routerBreadcrum: any = [];
  numberGroup: any = "0";
  titleGroup: string = "";
  dateDeparture: any = new FormControl("");
  departures$: Departure[] = [];
  weeklyHistory: WeeklyDeparture[] = [];
  selectedWeek: string = 'actual';

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor(){
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.numberGroup = this.rutaActiva.snapshot.params;
    this.titleGroup = this.numberGroup.number !== "0" ? `(Grupo ${this.numberGroup.number})` : "";
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[10];
    this.territoryDataService.getWeeklyDepartures().subscribe(history => {
      this.weeklyHistory = history;
      
      // Intentar encontrar la semana actual del calendario en el historial
      const currentWeekId = getWeekId(new Date());
      const currentWeekInHistory = this.weeklyHistory.find(w => w.weekId === currentWeekId);

      if (currentWeekInHistory) {
        this.selectedWeek = currentWeekInHistory.id || '';
        this.departures$ = currentWeekInHistory.departure;
        this.sortDepartures();
        this.dateDeparture.setValue(currentWeekInHistory.weekId);
        this.spinner.cerrarSpinner();
      } else {
        // Si no está en el historial, cargar lo que esté configurado como actual (docDeparture)
        this.territoryDataService.getDepartures().subscribe({
          next: (departure: DepartureData) => {
            this.departures$ = departure.departure;
            this.sortDepartures();
            this.territoryDataService.getDateDepartures().subscribe({
              next: (date: DateDeparture) => {
                this.dateDeparture.setValue(date.date);
                this.spinner.cerrarSpinner();
              }
            });
          }
        });
      }
    });
  }

  sortDepartures() {
    this.departures$.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }

  onWeekChange() {
    this.spinner.cargarSpinner();
    if (this.selectedWeek === 'actual') {
      this.territoryDataService.getDepartures().subscribe(departure => {
        this.departures$ = departure.departure;
        this.sortDepartures();
        this.territoryDataService.getDateDepartures().subscribe(date => {
          this.dateDeparture.setValue(date.date);
          this.spinner.cerrarSpinner();
        });
      });
    } else {
      const historyRecord = this.weeklyHistory.find(w => w.id === this.selectedWeek);
      if (historyRecord) {
        this.departures$ = historyRecord.departure;
        this.sortDepartures();
        this.dateDeparture.setValue(historyRecord.weekId);
      }
      this.spinner.cerrarSpinner();
    }
  }

  getFormattedDate(date: string): string {
    return formatWeekRange(date);
  }
}
