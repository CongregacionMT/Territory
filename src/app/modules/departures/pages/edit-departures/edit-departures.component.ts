import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom, take } from 'rxjs';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { MeetingPointService } from '@core/services/meeting-point.service';
import { DialogService } from '@core/services/dialog.service';
import { DepartureFormService, WeekFillState } from '@core/services/departure-form.service';
import { CanComponentDeactivate } from '@core/guards/unsaved-changes.guard';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { MeetingPoint } from '@core/models/MeetingPoint';
import {
  addDaysToIsoDate,
  daysBetweenIsoDates,
  formatWeekRange,
  getWeekId,
  parseIsoDate,
} from '@shared/utils/date-utils';
import { FormEditDeparturesComponent } from '../../components/form-edit-departures/form-edit-departures.component';

type LoadState = 'loading' | 'ready' | 'error';
type SaveStatus = 'saving' | 'dirty' | 'saved' | 'clean';

interface WeekOption {
  weekId: string;
  label: string;
  relativeLabel: string;
  stateLabel: string;
  stateClass: string;
  isSelected: boolean;
}

const WEEK_STATE_PRESENTATION: Record<WeekFillState, { label: string; cssClass: string }> = {
  empty: { label: 'Vacía', cssClass: 'bg-slate-500/20 text-slate-300' },
  incomplete: { label: 'Incompleta', cssClass: 'bg-amber-500/20 text-amber-300' },
  complete: { label: 'Completa', cssClass: 'bg-green-500/20 text-green-300' },
};

const SNACKBAR_MS = 4000;
const WEEKS_BACK_IN_MENU = 8;
const WEEKS_AHEAD_IN_MENU = 4;
const DAYS_PER_WEEK = 7;

@Component({
  selector: 'app-edit-departures',
  templateUrl: './edit-departures.component.html',
  styleUrls: ['./edit-departures.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormEditDeparturesComponent, NgClass],
  providers: [DialogService],
})
export class EditDeparturesComponent implements OnInit, CanComponentDeactivate {
  private readonly destroyRef = inject(DestroyRef);
  private readonly territoryDataService = inject(TerritoryDataService);
  private readonly meetingPointService = inject(MeetingPointService);
  private readonly departureFormService = inject(DepartureFormService);
  private readonly dialogService = inject(DialogService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly formEdit = viewChild(FormEditDeparturesComponent);
  private readonly weekMenuRoot = viewChild<ElementRef<HTMLElement>>('weekMenuRoot');
  private readonly weekMenuButton = viewChild<ElementRef<HTMLButtonElement>>('weekMenuButton');

  private lastLoadId = 0;

  readonly currentWeekId = signal('');
  readonly weekId = signal('');
  readonly loadState = signal<LoadState>('loading');
  readonly formDepartureData = signal<Departure[]>([]);
  readonly weekHasNoDepartures = signal(false);
  readonly startedBlank = signal(false);
  /** True while the loaded departures are an unsaved copy of another week. */
  readonly draftOnLoad = signal(false);
  readonly weeklyHistory = signal<WeeklyDeparture[]>([]);
  readonly historyLoaded = signal(false);
  readonly meetingPoints = signal<MeetingPoint[]>([]);
  readonly isChildFormDirty = signal(false);
  readonly isSaving = signal(false);
  readonly justSaved = signal(false);
  readonly weekMenuOpen = signal(false);
  private readonly chosenCopySource = signal('');

  readonly selectedWeekRange = computed(() => formatWeekRange(this.weekId()));
  readonly isCurrentWeek = computed(
    () => !!this.weekId() && this.weekId() === this.currentWeekId(),
  );
  readonly hasUnsavedChanges = computed(() => this.isChildFormDirty());
  readonly canSave = computed(
    () => this.hasUnsavedChanges() && !this.isSaving() && this.loadState() === 'ready',
  );

  readonly isEmptyWeekPrompt = computed(
    () =>
      this.loadState() === 'ready' &&
      this.weekHasNoDepartures() &&
      !this.startedBlank() &&
      this.formDepartureData().length === 0,
  );
  readonly showForm = computed(() => this.loadState() === 'ready' && !this.isEmptyWeekPrompt());

  readonly saveStatus = computed<SaveStatus>(() => {
    if (this.isSaving()) return 'saving';
    if (this.hasUnsavedChanges()) return 'dirty';
    return this.justSaved() ? 'saved' : 'clean';
  });

  readonly copySourceOptions = computed(() =>
    [...this.weeklyHistory()]
      .filter(
        (week) =>
          week.weekId !== this.weekId() && this.departureFormService.hasCopyableDepartures(week),
      )
      .sort((a, b) => b.weekId.localeCompare(a.weekId))
      .map((week) => ({ weekId: week.weekId, label: formatWeekRange(week.weekId) })),
  );
  readonly copySourceWeekId = computed(
    () =>
      this.chosenCopySource() ||
      this.departureFormService.findSourceWeek(this.weeklyHistory(), this.weekId())?.weekId ||
      '',
  );
  readonly copySourceLabel = computed(() => formatWeekRange(this.copySourceWeekId()));

  readonly nextWeekId = computed(() =>
    this.currentWeekId() ? addDaysToIsoDate(this.currentWeekId(), DAYS_PER_WEEK) : '',
  );
  readonly shouldOfferNextWeek = computed(() => {
    const next = this.nextWeekId();
    if (!next || !this.historyLoaded() || this.weekId() === next) return false;
    const nextWeek = this.weeklyHistory().find((week) => week.weekId === next);
    return this.departureFormService.getWeekFillState(nextWeek?.departure ?? []) === 'empty';
  });

  readonly weekOptions = computed<WeekOption[]>(() => this.buildWeekOptions());

  ngOnInit(): void {
    this.currentWeekId.set(getWeekId(new Date()));

    this.loadHistory();
    this.loadMeetingPoints();
    this.loadWeek(this.currentWeekId());
  }

  // ---------------------------------------------------------------- loading

  private loadHistory(): void {
    this.territoryDataService
      .getWeeklyDepartures(15)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((history) => {
        this.weeklyHistory.set((history ?? []).filter((week) => !!week?.weekId));
        this.historyLoaded.set(true);
      });
  }

  private loadMeetingPoints(): void {
    this.meetingPointService
      .getMeetingPoints()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((points) => this.meetingPoints.set(points));
  }

  loadWeek(weekId: string): void {
    const loadId = ++this.lastLoadId;
    this.weekId.set(weekId);
    this.loadState.set('loading');
    this.startedBlank.set(false);
    this.draftOnLoad.set(false);
    this.justSaved.set(false);
    this.weekMenuOpen.set(false);
    this.chosenCopySource.set('');
    this.formDepartureData.set([]);

    // take(1): una sola lectura, así los cambios en tiempo real no reinician lo que se edita.
    this.territoryDataService
      .getWeeklyDeparture(weekId)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (week) => {
          if (loadId !== this.lastLoadId) return;
          const departures = week?.departure ?? [];
          this.formDepartureData.set(departures);
          this.weekHasNoDepartures.set(departures.length === 0);
          this.loadState.set('ready');
        },
        error: (error: unknown) => {
          if (loadId !== this.lastLoadId) return;
          console.error('Error loading weekly departures:', error);
          this.loadState.set('error');
        },
      });
  }

  retryLoad(): void {
    this.loadWeek(this.weekId());
  }

  // ------------------------------------------------------------- navigation

  async navigateToWeek(targetWeekId: string): Promise<void> {
    this.weekMenuOpen.set(false);
    if (!targetWeekId || targetWeekId === this.weekId()) return;
    if (!(await this.confirmDiscardChanges())) return;
    this.loadWeek(targetWeekId);
  }

  goToCurrentWeek(): Promise<void> {
    return this.navigateToWeek(this.currentWeekId());
  }

  goToNextWeek(): Promise<void> {
    return this.navigateToWeek(this.nextWeekId());
  }

  prevWeek(): Promise<void> {
    return this.navigateToWeek(addDaysToIsoDate(this.weekId(), -DAYS_PER_WEEK));
  }

  nextWeek(): Promise<void> {
    return this.navigateToWeek(addDaysToIsoDate(this.weekId(), DAYS_PER_WEEK));
  }

  onPickDate(event: Event): Promise<void> {
    const date = parseIsoDate((event.target as HTMLInputElement).value);
    return date ? this.navigateToWeek(getWeekId(date)) : Promise.resolve();
  }

  toggleWeekMenu(): void {
    this.weekMenuOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.weekMenuOpen()) return;
    const root = this.weekMenuRoot()?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.weekMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.weekMenuOpen()) return;
    this.weekMenuOpen.set(false);
    this.weekMenuButton()?.nativeElement.focus();
  }

  // ------------------------------------------------------- unsaved changes

  canDeactivate(): boolean | Promise<boolean> {
    return this.confirmDiscardChanges();
  }

  private async confirmDiscardChanges(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) return true;

    const discard = await firstValueFrom(
      this.dialogService.confirmDialog(
        'Si cambiás de pantalla ahora, perdés lo que editaste y no guardaste.',
        true,
        {
          title: 'Hay cambios sin guardar',
          confirmLabel: 'Descartar cambios',
          cancelLabel: 'Seguir editando',
        },
      ),
      { defaultValue: false },
    );
    return discard === true;
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: BeforeUnloadEvent): void {
    // preventDefault is what makes the browser show its own "leave site?" prompt.
    if (this.hasUnsavedChanges()) {
      $event.preventDefault();
    }
  }

  // ------------------------------------------------------------ week start

  copyFromPreviousWeek(): void {
    const source = this.weeklyHistory().find((week) => week.weekId === this.copySourceWeekId());
    const drafts = source
      ? this.departureFormService.createWeekFromSource(source, this.weekId())
      : [];

    if (drafts.length === 0) {
      this.notify('No hay salidas para copiar en esa semana.');
      return;
    }

    // El borrador queda marcado como "sin guardar": nada se publica hasta tocar Guardar semana.
    this.draftOnLoad.set(true);
    this.formDepartureData.set(drafts);
    this.notify(
      'Copiamos los días, horarios y lugares. Asigná conductores y territorios y guardá para publicar la semana.',
    );
  }

  chooseCopySource(event: Event): void {
    this.chosenCopySource.set((event.target as HTMLSelectElement).value);
  }

  startBlank(): void {
    this.startedBlank.set(true);
  }

  // ----------------------------------------------------------------- saving

  async saveWeek(): Promise<void> {
    const form = this.formEdit();
    if (!form || !this.canSave()) return;

    this.isSaving.set(true);
    try {
      const result = await form.submitForm();
      this.justSaved.set(true);

      this.notify(
        `Semana guardada: ${this.selectedWeekRange()}.${this.describeMovedDepartures(result.movedToOtherWeeks)}`,
      );
    } catch (error) {
      console.error('Error saving weekly departures:', error);
      this.notify(
        'No se pudo guardar. Tus cambios siguen en pantalla: revisá la conexión y volvé a intentar.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  // ---------------------------------------------------------------- helpers

  private describeMovedDepartures(count: number): string {
    if (count === 0) return '';
    const subject = count === 1 ? 'Una salida pasó' : `${count} salidas pasaron`;
    return ` ${subject} a la semana que corresponde a su fecha.`;
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Ok', { verticalPosition: 'top', duration: SNACKBAR_MS });
  }

  private buildWeekOptions(): WeekOption[] {
    const current = this.currentWeekId();
    if (!current) return [];

    const history = new Map(this.weeklyHistory().map((week) => [week.weekId, week]));
    const ids = new Set<string>([this.weekId()]);

    for (let offset = -WEEKS_BACK_IN_MENU; offset <= WEEKS_AHEAD_IN_MENU; offset++) {
      const id = addDaysToIsoDate(current, offset * DAYS_PER_WEEK);
      // Past weeks only appear when they have something to open.
      if (offset >= 0 || history.has(id)) ids.add(id);
    }
    this.weeklyHistory().forEach((week) => week.weekId > current && ids.add(week.weekId));

    return [...ids]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))
      .map((id) => {
        const state = this.departureFormService.getWeekFillState(history.get(id)?.departure ?? []);
        const presentation = WEEK_STATE_PRESENTATION[state];
        return {
          weekId: id,
          label: formatWeekRange(id),
          relativeLabel: this.getRelativeWeekLabel(current, id),
          stateLabel: presentation.label,
          stateClass: presentation.cssClass,
          isSelected: id === this.weekId(),
        };
      });
  }

  private getRelativeWeekLabel(currentWeek: string, weekId: string): string {
    const days = daysBetweenIsoDates(currentWeek, weekId);
    if (days === null) return '';

    const weeks = Math.round(days / DAYS_PER_WEEK);
    if (weeks === 0) return 'Esta semana';
    if (weeks === 1) return 'Próxima semana';
    if (weeks === -1) return 'Semana pasada';
    return weeks > 0 ? `En ${weeks} semanas` : `Hace ${-weeks} semanas`;
  }
}
