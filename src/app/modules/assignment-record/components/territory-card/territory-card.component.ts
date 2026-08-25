import { Component, ChangeDetectionStrategy, input, output, signal, effect } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Card } from '@core/models/Card';
import { parseFirebaseDate } from '@shared/utils/date-utils';

@Component({
  selector: 'app-territory-card',
  standalone: true,
  imports: [DatePipe, NgClass, FormsModule],
  templateUrl: './territory-card.component.html',
  styleUrls: ['./territory-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritoryCardComponent {
  card = input.required<Card>();
  isEditing = input<boolean>(false);
  hasPendingChange = input<boolean>(false);
  isMarkedForDelete = input<boolean>(false);

  editStart = output<void>();
  editCancel = output<void>();
  editApply = output<{ driver?: string; start?: string; end?: string }>();
  deleteMark = output<void>();
  deleteCancel = output<void>();

  // Estado interno para el formulario de edición
  editFormData = signal<{ driver?: string; start?: string; end?: string }>({});

  constructor() {
    // Sincronizar el formulario interno cuando la tarjeta cambia o entra en modo edición
    effect(
      () => {
        if (this.isEditing()) {
          const c = this.card();
          const startVal = c.start
            ? new Date(c.start).toISOString().split('T')[0]
            : parseFirebaseDate(c.creation).toISOString().split('T')[0];
          const endVal = c.end && c.end !== '0' ? new Date(c.end).toISOString().split('T')[0] : '';

          this.editFormData.set({
            driver: c.driver,
            start: startVal,
            end: endVal,
          });
        }
      },
      { allowSignalWrites: true },
    );
  }

  updateField(field: 'driver' | 'start' | 'end', value: string): void {
    this.editFormData.update((data) => ({ ...data, [field]: value }));
  }

  onApply(): void {
    this.editApply.emit(this.editFormData());
  }

  get parsedCreationDate(): Date {
    return parseFirebaseDate(this.card().creation);
  }
}
