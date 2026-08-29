import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { User } from '@core/models/User';
import { LocalityConfig } from '@core/models/LocalityData';
import { MeetingPoint } from '@core/models/MeetingPoint';

@Component({
  selector: 'app-departure-day-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './departure-day-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartureDayCardComponent {
  dayFormGroup = input.required<FormGroup>();
  index = input.required<number>();
  groupIndex = input.required<number>();

  isAdmin = input<boolean>(false);
  drivers = input<User[]>([]);
  localities = input<LocalityConfig[]>([]);

  suggestedTerritories = input<string[]>([]);
  quickSuggestionText = input<string | null>(null);
  meetingPoints = input<MeetingPoint[]>([]);

  delete = output<void>();
  dayCopy = output<void>();
  openModal = output<void>();
  applySuggested = output<string>();

  get dateValue(): string {
    return String(this.dayFormGroup().get('date')?.value ?? '');
  }

  get scheduleValue(): string {
    return String(this.dayFormGroup().get('schedule')?.value ?? '');
  }

  get locationValue(): string {
    return String(this.dayFormGroup().get('location')?.value ?? '');
  }

  get isEvent(): boolean {
    return Boolean(this.dayFormGroup().get('isEvent')?.value);
  }

  get cardStatus(): string {
    return String(this.dayFormGroup().get('cardStatus')?.value ?? 'pending');
  }

  getDepartureTitle(date: string, schedule: string): string {
    if (!date) return 'Nueva Salida';
    // Use UTC trick to avoid timezone shifts
    const [year, month, day] = date.split('-');
    const dayName = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0),
    ).toLocaleDateString('es-AR', { weekday: 'long' });
    const formattedSchedule = schedule ? ` a las ${schedule}` : '';
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}${formattedSchedule}`;
  }

  getCardStatusClass(): string {
    const status = this.cardStatus;
    if (status === 'received') return 'bg-green-500/20 text-green-300 border border-green-500/30';
    if (status === 'not_required')
      return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
    return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  }

  getCardStatusLabel(): string {
    const status = this.cardStatus;
    if (status === 'received') return 'Revisada';
    if (status === 'not_required') return 'No requiere';
    return 'Pendiente';
  }

  getColorSwatch(color: string): string {
    const colors: Record<string, string> = {
      primary: '#3b82f6',
      secondary: '#64748b',
      success: '#22c55e',
      danger: '#ef4444',
      warning: '#eab308',
      info: '#06b6d4',
      light: '#f8fafc',
      dark: '#0f172a',
    };
    return colors[color] || colors['secondary'];
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
    return `https://www.territoryhelper.com/es/Territory/${locationPrefix}-${territoryNumber}`;
  }

  onChangeInput(event: Event, controlName: string): void {
    const val = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.dayFormGroup().get(controlName)?.markAsDirty();
    this.dayFormGroup().get(controlName)?.setValue(val);

    if (controlName === 'point' && val) {
      const pointMatch = this.meetingPoints().find(
        (p) => p.name.toLowerCase() === val.toLowerCase(),
      );
      if (pointMatch && pointMatch.mapsUrl) {
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
      if (territoryArray) {
        territoryArray.clear();
      }
    }
  }

  onToggleCardReceived(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.dayFormGroup().get('cardStatus')?.markAsDirty();
    this.dayFormGroup()
      .get('cardStatus')
      ?.setValue(checked ? 'received' : 'pending');
  }
}
