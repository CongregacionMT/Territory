import {
  Component,
  OnInit,
  inject,
  ViewChild,
  HostListener,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatSnackBar,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { Departure } from '@core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { FormEditDeparturesComponent } from '../../components/form-edit-departures/form-edit-departures.component';
import { CanComponentDeactivate } from '@core/guards/unsaved-changes.guard';
import { WeeklyDeparture } from '@core/models/Departures';
import { formatWeekRange, getWeekId } from '@shared/utils/date-utils';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-departures',
  templateUrl: './edit-departures.component.html',
  styleUrls: ['./edit-departures.component.scss'],
  imports: [ReactiveFormsModule, FormEditDeparturesComponent, FormsModule],
})
export class EditDeparturesComponent implements OnInit, CanComponentDeactivate {
  @ViewChild(FormEditDeparturesComponent)
  formEditComponent!: FormEditDeparturesComponent;
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private _snackBar = inject(MatSnackBar);

  dataLoaded: boolean = false;
  routerBreadcrum: any = [];
  dateDeparture: any = new FormControl('');
  selectedWeekRange: string = '';
  formDepartureData: Departure[] = [] as Departure[];
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  isSaved: boolean = false;
  weeklyHistory: WeeklyDeparture[] = [];
  selectedHistoryWeek: string = '';

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[11];
    // Escuchar cambios en la fecha (esto manejará la carga de datos)
    this.dateDeparture.valueChanges.subscribe((value: string) => {
      this.isSaved = false;
      if (value) {
        const dateObj = new Date(value + 'T00:00:00');
        if (isNaN(dateObj.getTime())) return;

        const monday = this.getMonday(dateObj);
        if (isNaN(monday.getTime())) return;

        const mondayStr = monday.toISOString().split('T')[0];

        // Ajustar al lunes si es necesario
        if (value !== mondayStr) {
          this.dateDeparture.setValue(mondayStr, { emitEvent: false });
        }
        this.selectedWeekRange = this.formatWeekRange(monday);

        // Cargar los datos (buscar en historial y sino usar master)
        this.loadDepartureData(mondayStr);

        // Sincronizar el selector de historial
        const historyMatch = this.weeklyHistory.find(
          (w) => w.weekId === mondayStr,
        );
        this.selectedHistoryWeek = historyMatch ? historyMatch.id || '' : '';
      }
    });

    // Cargar historial
    this.loadHistory();

    // Obtener la fecha actual configurada y arrancar la primera carga
    this.territoryDataService.getDateDepartures().subscribe({
      next: (res) => {
        const dateStr = res?.date;
        const initialDate =
          dateStr && !isNaN(new Date(dateStr + 'T00:00:00').getTime())
            ? dateStr
            : new Date().toISOString().split('T')[0];

        const dateObj = new Date(initialDate + 'T00:00:00');
        const monday = this.getMonday(dateObj);

        if (!isNaN(monday.getTime())) {
          const mondayStr = monday.toISOString().split('T')[0];
          this.dateDeparture.setValue(mondayStr);
          this.selectedWeekRange = this.formatWeekRange(monday);
          // Al llamar a setValue() arriba, se dispara valueChanges y carga los datos
        }

        this.dateDeparture.markAsPristine();
      },
    });
  }

  loadHistory() {
    this.territoryDataService.getWeeklyDepartures().subscribe((history) => {
      // Calcular la fecha lunes de hace 8 semanas
      const today = new Date();
      const currentMonday = this.getMonday(today);
      const eightWeeksAgo = new Date(currentMonday);
      eightWeeksAgo.setDate(currentMonday.getDate() - 7 * 8);
      const eightWeeksAgoStr = eightWeeksAgo.toISOString().split('T')[0];

      // Filtrar: solo semanas >= ocho semanas atrás y ordenar por fecha descendente
      this.weeklyHistory = history
        .filter((w) => w.weekId >= eightWeeksAgoStr)
        .sort((a, b) => b.weekId.localeCompare(a.weekId));
    });
  }

  deleteWeek() {
    if (!this.selectedHistoryWeek) return;

    // Buscar la semana en el historial local para obtener el weekId
    const selected = this.weeklyHistory.find(
      (w) => w.id === this.selectedHistoryWeek,
    );
    if (!selected) return;

    if (
      confirm(
        `¿Estás seguro de que quieres eliminar las salidas de la semana del ${this.getFormattedHistoryDate(selected.weekId)}?`,
      )
    ) {
      this.spinner.cargarSpinner();
      this.territoryDataService
        .deleteWeeklyDeparture(selected.weekId)
        .then(() => {
          this._snackBar.open('Semana eliminada correctamente', 'Ok', {
            duration: 3000,
          });
          this.selectedHistoryWeek = '';
          this.formDepartureData = []; // Limpiar el formulario
          this.loadHistory(); // Recargar el historial
          this.spinner.cerrarSpinner();
        })
        .catch((err) => {
          console.error(err);
          this._snackBar.open('Error al eliminar la semana', 'Ok', {
            duration: 3000,
          });
          this.spinner.cerrarSpinner();
        });
    }
  }

  loadDepartureData(weekId: string) {
    this.spinner.cargarSpinner();
    this.territoryDataService.getWeeklyDeparture(weekId).subscribe({
      next: (weeklyData) => {
        if (
          weeklyData &&
          weeklyData.departure &&
          weeklyData.departure.length > 0
        ) {
          this.formDepartureData = weeklyData.departure;
          this.dataLoaded = true;
          this.spinner.cerrarSpinner();
        } else {
          // Si no existe historial para esta semana, cargamos las salidas master (docDeparture)
          // Esto sirve como base/plantilla para nuevas semanas
          this.territoryDataService.getDepartures().subscribe({
            next: (masterData) => {
              this.formDepartureData = masterData?.departure || [];
              this.dataLoaded = true;
              this.spinner.cerrarSpinner();
            },
            error: () => {
              this.formDepartureData = [];
              this.dataLoaded = true;
              this.spinner.cerrarSpinner();
            },
          });
        }
      },
      error: () => {
        // En caso de error, intentar también cargar el master por si acaso
        this.territoryDataService.getDepartures().subscribe({
          next: (masterData) => {
            this.formDepartureData = masterData?.departure || [];
            this.dataLoaded = true;
            this.spinner.cerrarSpinner();
          },
          error: () => {
            this.formDepartureData = [];
            this.dataLoaded = true;
            this.spinner.cerrarSpinner();
          },
        });
      },
    });
  }

  onWeekSelect() {
    if (this.selectedHistoryWeek) {
      const selected = this.weeklyHistory.find(
        (w) => w.id === this.selectedHistoryWeek,
      );
      if (selected) {
        this.dateDeparture.setValue(selected.weekId);
        // El valueChanges de dateDeparture se encargará de llamar a loadDepartureData
      }
    }
  }

  getFormattedHistoryDate(weekId: string): string {
    return formatWeekRange(weekId);
  }
  updateDate() {
    this._snackBar.open(`Semana actualizada: ${this.selectedWeekRange}`, 'Ok', {
      verticalPosition: this.verticalPosition,
    });
    this.territoryDataService.putDate({ date: this.dateDeparture.value });
    this.dateDeparture.markAsPristine();
    this.isSaved = true;
    // Si se actualiza la fecha, marcamos el formulario como guardado
    if (this.formEditComponent) {
      this.formEditComponent.isSaved = true;
    }
  }

  canDeactivate(): boolean {
    const isChildDirty =
      this.formEditComponent && this.formEditComponent.isDirty();
    const isMainDirty = this.dateDeparture.dirty;
    const childSaved = this.formEditComponent
      ? this.formEditComponent.isSaved
      : true;

    if ((isChildDirty || isMainDirty) && (!this.isSaved || !childSaved)) {
      return confirm(
        '⚠️ Tienes cambios sin guardar. Si sales ahora, perderás lo que has editado. ¿Estás seguro de que quieres salir?',
      );
    }
    return true;
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    const isChildDirty =
      this.formEditComponent && this.formEditComponent.isDirty();
    const isMainDirty = this.dateDeparture.dirty;
    const childSaved = this.formEditComponent
      ? this.formEditComponent.isSaved
      : true;

    if ((isChildDirty || isMainDirty) && (!this.isSaved || !childSaved)) {
      $event.returnValue = 'Tienes cambios sin guardar.';
    }
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  private formatWeekRange(monday: Date): string {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
    };
    const mondayStr = monday.toLocaleDateString('es-ES', options);
    const sundayStr = sunday.toLocaleDateString('es-ES', options);

    return `${mondayStr} al ${sundayStr}`;
  }
}
