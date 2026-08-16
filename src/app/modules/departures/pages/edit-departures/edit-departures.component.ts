import {
  Component,
  OnInit,
  inject,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy
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
import { take } from 'rxjs';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-edit-departures',
  templateUrl: './edit-departures.component.html',
  styleUrls: ['./edit-departures.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
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
  isAdmin: boolean = false;
  isCardsCollapsed: boolean = true;
  weeklyHistory: WeeklyDeparture[] = [];
  selectedHistoryWeek: string = '';
  currentMondayStr: string = '';
  private lastLoadId: number = 0;
  private readonly weeklySlots = [
    { offset: 1, schedule: '18:30', group: 1, color: 'info' },
    { offset: 1, schedule: '18:30', group: 2, color: 'info' },
    { offset: 2, schedule: '09:30', group: 0, color: 'success' },
    { offset: 4, schedule: '18:30', group: 0, color: 'success' },
    { offset: 5, schedule: '09:30', group: 0, color: 'success' },
    { offset: 6, schedule: '10:00', group: 1, color: 'info' },
    { offset: 6, schedule: '10:00', group: 2, color: 'info' },
  ];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.isAdmin = !!localStorage.getItem('tokenAdmin');
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[11];

    // Calcular el lunes de la semana actual para el badge y el botón "Volver a hoy"
    const todayMonday = this.getMonday(new Date());
    this.currentMondayStr = todayMonday.toISOString().split('T')[0];

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

    // Cargar la semana inicial: siempre se usa la semana actual como punto de partida
    this.territoryDataService
      .getDateDepartures()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          // Siempre arrancamos en la semana actual, ignorando la fecha guardada en Firestore
          const mondayStr = this.currentMondayStr;
          this.dateDeparture.setValue(mondayStr);
          this.selectedWeekRange = this.formatWeekRange(todayMonday);
          this.dateDeparture.markAsPristine();
        },
        error: () => {
          // Si no hay datos, cargar igualmente con la semana actual
          this.dateDeparture.setValue(this.currentMondayStr);
          this.selectedWeekRange = this.formatWeekRange(todayMonday);
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
    const loadId = ++this.lastLoadId;
    this.spinner.cargarSpinner();
    this.dataLoaded = false;
    this.formDepartureData = [];

    // take(1): lectura única — evita que las actualizaciones en tiempo real de Firestore
    // reinicien el formulario mientras el usuario está editando
    this.territoryDataService
      .getWeeklyDeparture(weekId)
      .pipe(take(1))
      .subscribe({
        next: (weeklyData) => {
          if (loadId !== this.lastLoadId) return;

          if (
            weeklyData &&
            weeklyData.departure &&
            weeklyData.departure.length > 0
          ) {
            this.formDepartureData = weeklyData.departure;
            this.dataLoaded = true;
            this.spinner.cerrarSpinner();
          } else {
            this.territoryDataService
              .getDepartures()
              .pipe(take(1))
              .subscribe({
                next: (masterData) => {
                  if (loadId !== this.lastLoadId) return;
                  this.formDepartureData = masterData?.departure || [];
                  this.dataLoaded = true;
                  this.spinner.cerrarSpinner();
                },
                error: () => {
                  if (loadId !== this.lastLoadId) return;
                  this.formDepartureData = [];
                  this.dataLoaded = true;
                  this.spinner.cerrarSpinner();
                },
              });
          }
        },
        error: () => {
          if (loadId !== this.lastLoadId) return;
          this.territoryDataService
            .getDepartures()
            .pipe(take(1))
            .subscribe({
              next: (masterData) => {
                if (loadId !== this.lastLoadId) return;
                this.formDepartureData = masterData?.departure || [];
                this.dataLoaded = true;
                this.spinner.cerrarSpinner();
              },
              error: () => {
                if (loadId !== this.lastLoadId) return;
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
  markAsReceivedQuick(departure: Departure) {
    if (this.formEditComponent) {
      const marked = this.formEditComponent.markDepartureAsReceived(departure);
      if (marked) {
        this.saveAll();
      } else {
        this._snackBar.open('No se pudo encontrar la salida en el formulario', 'Ok', { duration: 3000 });
      }
    }
  }

  saveAll() {
    if (!this.dateDeparture.value) return;

    // 1. Guardar la semana activa
    this.territoryDataService.putDate({ date: this.dateDeparture.value });
    this.dateDeparture.markAsPristine();
    this.isSaved = true;

    // 2. Guardar el formulario de salidas (componente hijo)
    if (this.formEditComponent) {
      const savedData = this.formEditComponent.submitForm();
      if (savedData) {
        this.formDepartureData = savedData;
      }
    } else {
      this._snackBar.open(`Semana guardada: ${this.selectedWeekRange}`, 'Ok', {
        verticalPosition: this.verticalPosition,
        duration: 3000,
      });
    }
  }

  createStandardWeek(copyTerritories: boolean = false) {
    if (!this.dateDeparture.value) return;

    const sourceWeek = this.weeklyHistory
      .filter((week) => week.weekId < this.dateDeparture.value)
      .sort((a, b) => b.weekId.localeCompare(a.weekId))[0];

    let departures: Departure[] = [];

    if (copyTerritories) {
      if (!sourceWeek || !sourceWeek.departure || sourceWeek.departure.length === 0) {
        this._snackBar.open('No hay salidas en la semana anterior para duplicar.', 'Ok', { duration: 4000 });
        return;
      }

      // Duplicar exactamente la semana anterior desplazando las fechas de cada salida
      departures = sourceWeek.departure.map((source, index) => {
        const targetDate = this.shiftDateByWeeks(
          source.date,
          sourceWeek.weekId,
          this.dateDeparture.value,
        );

        return this.territoryDataService.normalizeDepartureForCardTracking(
          {
            driver: source.driver || '',
            location: source.location || environment.territoryPrefix,
            territory: [],
            date: targetDate,
            maps: source.maps || '',
            point: source.point || '',
            schedule: source.schedule || '',
            color: source.color || '',
            group: source.group,
            isEvent: source.isEvent || false,
            title: source.title || '',
            cardStatus: 'pending',
          },
          this.dateDeparture.value,
          index,
        );
      });
    } else {
      // Crear semana tipo usando los slots estándar
      departures = this.weeklySlots.map((slot, index) => {
        const source = this.findSourceDeparture(sourceWeek, slot);
        const targetDate = this.getDateFromWeekOffset(
          this.dateDeparture.value,
          slot.offset,
        );

        return this.territoryDataService.normalizeDepartureForCardTracking(
          {
            driver: source?.driver || '',
            location: source?.location || environment.territoryPrefix,
            territory: [],
            date: targetDate,
            maps: source?.maps || '',
            point: source?.point || '',
            schedule: slot.schedule,
            color: source?.color || slot.color,
            group: slot.group,
            isEvent: false,
            title: '',
            cardStatus: 'pending',
          },
          this.dateDeparture.value,
          index,
        );
      });
    }

    this.formDepartureData = departures;
    this.dataLoaded = true;
    this.isSaved = false;
    this.selectedHistoryWeek = '';

    this._snackBar.open(
      copyTerritories
        ? 'Semana anterior duplicada exactamente. Revisá antes de guardar.'
        : 'Semana tipo creada. Puntos y conductores se tomaron de la semana anterior cuando estaban disponibles.',
      'Ok',
      { duration: 4000 },
    );
  }

  private shiftDateByWeeks(dateStr: string, sourceWeekId: string, targetWeekId: string): string {
    const sourceDate = new Date(`${dateStr}T00:00:00`);
    const sourceMonday = new Date(`${sourceWeekId}T00:00:00`);
    const targetMonday = new Date(`${targetWeekId}T00:00:00`);

    if (isNaN(sourceDate.getTime()) || isNaN(sourceMonday.getTime()) || isNaN(targetMonday.getTime())) {
      return dateStr;
    }

    const diffTime = targetMonday.getTime() - sourceMonday.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    sourceDate.setDate(sourceDate.getDate() + diffDays);
    return sourceDate.toISOString().split('T')[0];
  }

  private readonly CARD_TRACKING_START_DATE = '2026-05-11';

  isBeforeTrackingStart(dateStr: string): boolean {
    if (!dateStr) return false;
    return dateStr < this.CARD_TRACKING_START_DATE;
  }

  /** Formatea una fecha como "Domingo 17 de mayo" */
  getHumanDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;

    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthsOfYear = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const dayName = daysOfWeek[date.getDay()];
    const day = date.getDate();
    const month = monthsOfYear[date.getMonth()];
    return `${dayName} ${day} de ${month}`;
  }

  getPendingCardDepartures(): Departure[] {
    return (this.formDepartureData || [])
      .filter((departure) => !departure.isEvent)
      .filter((departure) => departure.cardStatus !== 'received')
      .filter((departure) => departure.cardStatus !== 'not_required')
      .filter((departure) => !this.isBeforeTrackingStart(departure.date))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getReceivedCardCount(): number {
    return (this.formDepartureData || []).filter(
      (departure) => departure.cardStatus === 'received' || this.isBeforeTrackingStart(departure.date),
    ).length;
  }

  getNotRequiredCardCount(): number {
    return (this.formDepartureData || []).filter(
      (departure) => departure.isEvent || departure.cardStatus === 'not_required',
    ).length;
  }

  getDepartureReminder(departure: Departure): string {
    const territories = (departure.territory || []).join(', ') || 'territorio asignado';
    const humanDate = this.getHumanDate(departure.date);
    return `Hola ${departure.driver || ''}, falta cargar la tarjeta de la salida del ${humanDate} a las ${departure.schedule} (${territories}). Gracias.`;
  }

  copyReminder(departure: Departure) {
    const reminder = this.getDepartureReminder(departure);
    navigator.clipboard?.writeText(reminder);
    this._snackBar.open('Recordatorio copiado', 'Ok', { duration: 2500 });
  }

  private findSourceDeparture(
    sourceWeek: WeeklyDeparture | undefined,
    slot: { offset: number; schedule: string; group: number },
  ): Departure | undefined {
    const sourceDepartures = sourceWeek?.departure || [];

    return (
      sourceDepartures.find(
        (departure) =>
          this.getWeekOffset(departure.date, sourceWeek?.weekId || '') ===
            slot.offset &&
          departure.schedule === slot.schedule &&
          Number(departure.group) === slot.group,
      ) ||
      sourceDepartures.find(
        (departure) =>
          departure.schedule === slot.schedule &&
          Number(departure.group) === slot.group,
      ) ||
      sourceDepartures.find((departure) => Number(departure.group) === slot.group)
    );
  }

  private getDateFromWeekOffset(weekId: string, offset: number): string {
    const date = new Date(`${weekId}T00:00:00`);
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  }

  private getWeekOffset(dateValue: string, weekId: string): number {
    const date = new Date(`${dateValue}T00:00:00`);
    const week = new Date(`${weekId}T00:00:00`);
    if (isNaN(date.getTime()) || isNaN(week.getTime())) return -1;

    return Math.round((date.getTime() - week.getTime()) / (1000 * 60 * 60 * 24));
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

  /** Retorna true si la semana mostrada es la semana actual */
  isCurrentWeek(): boolean {
    if (!this.currentMondayStr || !this.dateDeparture.value) return false;
    return this.dateDeparture.value === this.currentMondayStr;
  }

  /** Salta al lunes de la semana actual */
  goToCurrentWeek() {
    if (!this.canDeactivate()) return;
    this.dateDeparture.setValue(this.currentMondayStr);
  }

  /** Navega a la semana anterior */
  prevWeek() {
    if (!this.canDeactivate()) return;
    if (!this.dateDeparture.value) return;
    const current = new Date(this.dateDeparture.value + 'T00:00:00');
    current.setDate(current.getDate() - 7);
    this.dateDeparture.setValue(current.toISOString().split('T')[0]);
  }

  /** Navega a la semana siguiente */
  nextWeek() {
    if (!this.canDeactivate()) return;
    if (!this.dateDeparture.value) return;
    const current = new Date(this.dateDeparture.value + 'T00:00:00');
    current.setDate(current.getDate() + 7);
    this.dateDeparture.setValue(current.toISOString().split('T')[0]);
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
