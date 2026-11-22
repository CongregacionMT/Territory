import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { User } from '@core/models/User';
import { LocalityConfig } from '@core/models/LocalityData';
import { MeetingPoint } from '@core/models/MeetingPoint';
import { getCardStatusLabel } from '@shared/utils/departure-card.utils';
import { DEPARTURE_COLOR_OPTIONS, normalizeDepartureColor } from '@shared/utils/departure-colors';
import { formatDepartureTitle } from '@shared/utils/departure-format.utils';

export interface SuggestionChip {
  territory: string;
  /** "Hace 3 meses", "Nunca" or empty while the completion data is still loading. */
  ageLabel: string;
}

const FIELD_CLASS =
  'block w-full h-11 sm:h-10 rounded-xl bg-slate-900 border border-slate-700 text-slate-50 px-3 sm:text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:border-blue-400';
const LABEL_CLASS = 'text-sm font-bold text-slate-300';

@Component({
  selector: 'app-departure-day-card',
  templateUrl: './departure-day-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class DepartureDayCardComponent {
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  dayFormGroup = input.required<FormGroup>();
  index = input.required<number>();
  groupIndex = input.required<number>();

  isAdmin = input<boolean>(false);
  drivers = input<User[]>([]);
  localities = input<LocalityConfig[]>([]);

  suggestedTerritories = input<SuggestionChip[]>([]);
  /** Meeting point used the last time these territories went out; empty when there is none. */
  suggestedPoint = input<string>('');
  meetingPoints = input<MeetingPoint[]>([]);
  meetingPointsListId = input<string>('meeting-points-list');

  delete = output<void>();
  dayCopy = output<void>();
  openModal = output<void>();
  applySuggested = output<string>();
  applyPoint = output<void>();

  readonly fieldClass = FIELD_CLASS;
  readonly labelClass = LABEL_CLASS;
  readonly colorOptions = DEPARTURE_COLOR_OPTIONS;

  readonly idBase = computed(() => `dep-${this.groupIndex()}-${this.index()}`);
  readonly menuOpen = signal(false);

  private readonly menuRoot = viewChild<ElementRef<HTMLElement>>('menuRoot');
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly scheduleField = viewChild<ElementRef<HTMLInputElement>>('scheduleField');

  constructor() {
    // The form is edited from outside (territory modal, copy, suggestions): repaint on any change.
    effect((onCleanup) => {
      const subscription = this.dayFormGroup().valueChanges.subscribe(() => {
        this.cdr.markForCheck();
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  get dateValue(): string {
    return String(this.dayFormGroup().get('date')?.value ?? '');
  }

  get scheduleValue(): string {
    return String(this.dayFormGroup().get('schedule')?.value ?? '');
  }

  get locationValue(): string {
    return String(this.dayFormGroup().get('location')?.value ?? '');
  }

  /** With a single locality there is nothing to choose, so the field is not shown. */
  get hasSeveralLocalities(): boolean {
    return this.localities().length > 1;
  }

  get isEvent(): boolean {
    return Boolean(this.dayFormGroup().get('isEvent')?.value);
  }

  get cardStatus(): string {
    return String(this.dayFormGroup().get('cardStatus')?.value ?? 'pending');
  }

  get colorValue(): string {
    return normalizeDepartureColor(this.dayFormGroup().get('color')?.value as string);
  }

  get title(): string {
    return formatDepartureTitle(this.dateValue, this.scheduleValue);
  }

  get driverValue(): string {
    return String(this.dayFormGroup().get('driver')?.value ?? '');
  }

  get pointValue(): string {
    return String(this.dayFormGroup().get('point')?.value ?? '');
  }

  get mapsValue(): string {
    return String(this.dayFormGroup().get('maps')?.value ?? '');
  }

  get eventTitleValue(): string {
    return String(this.dayFormGroup().get('title')?.value ?? '');
  }

  get showSuggestedPoint(): boolean {
    const suggestion = this.suggestedPoint();
    return !!suggestion && suggestion !== this.pointValue;
  }

  getDriverOptionValue(driver: User): string {
    return driver.displayName || driver.user;
  }

  getCardStatusClass(): string {
    switch (this.cardStatus) {
      case 'received':
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'canceled':
      case 'not_required':
        return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
      default:
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }
  }

  getCardStatusLabel(): string {
    return getCardStatusLabel(this.cardStatus);
  }

  getTerritories(): string[] {
    const territoryArray = this.dayFormGroup().get('territory') as FormArray<
      FormControl<string>
    > | null;
    return (territoryArray?.value as string[]) || [];
  }

  getTerritoryLink(locationPrefix: string, territoryNumber: string): string {
    if (
      territoryNumber.toLowerCase() === 'personal' ||
      territoryNumber.toLowerCase() === 'tel/carta'
    ) {
      return '#';
    }
    const cleanNumber = territoryNumber.replace(/\D/g, '');
    return `${window.location.origin}/territorios/${locationPrefix}-${cleanNumber}`;
  }

  onChangeInput(event: Event, controlName: string): void {
    const val = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.dayFormGroup().get(controlName)?.markAsDirty();
    this.dayFormGroup().get(controlName)?.setValue(val);

    if (controlName === 'point' && val) {
      const pointMatch = this.meetingPoints().find(
        (p) => p.name.toLowerCase() === val.toLowerCase(),
      );
      if (pointMatch?.mapsUrl) {
        this.dayFormGroup().get('maps')?.setValue(pointMatch.mapsUrl);
        this.dayFormGroup().get('maps')?.markAsDirty();
      }
    }
  }

  onChangeCheckbox(event: Event, controlName: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.dayFormGroup().get(controlName)?.markAsDirty();
    this.dayFormGroup().get(controlName)?.setValue(checked);

    if (controlName === 'isEvent' && checked) {
      const territoryArray = this.dayFormGroup().get('territory') as FormArray<
        FormControl<string>
      > | null;
      territoryArray?.clear();
      this.dayFormGroup().get('cardStatus')?.setValue('not_required');
    } else if (controlName === 'isEvent') {
      this.dayFormGroup().get('cardStatus')?.setValue('pending');
    }
  }

  onToggleCardReceived(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.dayFormGroup().get('cardStatus')?.markAsDirty();
    this.dayFormGroup()
      .get('cardStatus')
      ?.setValue(checked ? 'received' : 'pending');
  }

  setColor(value: string): void {
    this.dayFormGroup().get('color')?.markAsDirty();
    this.dayFormGroup().get('color')?.setValue(value);
  }

  removeTerritory(territory: string): void {
    const territoryArray = this.dayFormGroup().get('territory') as FormArray<
      FormControl<string>
    > | null;
    if (!territoryArray) return;

    const position = territoryArray.value.indexOf(territory);
    if (position < 0) return;

    territoryArray.removeAt(position);
    territoryArray.markAsDirty();
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onCopy(): void {
    this.closeMenu();
    this.dayCopy.emit();
  }

  onDelete(): void {
    this.closeMenu();
    this.delete.emit();
  }

  onDocumentClick(event: Event): void {
    if (!this.menuOpen()) return;
    const root = this.menuRoot()?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  onEscape(): void {
    if (!this.menuOpen()) return;
    this.closeMenu();
    this.menuButton()?.nativeElement.focus();
  }

  /** Scrolls this card into view and focuses its first field. */
  reveal(): void {
    const prefersReducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.hostElement.nativeElement.scrollIntoView?.({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });
    this.scheduleField()?.nativeElement.focus({ preventScroll: true });
  }
}
