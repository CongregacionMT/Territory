import {
  Component,
  output,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  input,
  signal,
  effect,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartureInfo } from '@shared/utils/campaign.utils';

export interface EndCampaignData {
  leftoverInvitations: string;
  missingInvitations: number | null;
  departuresInfo: { checkedCount: number; details: DepartureInfo[] };
  finalComments: string;
  finalEndDate: string;
}

@Component({
  selector: 'app-end-campaign-modal',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './end-campaign-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndCampaignModalComponent {
  departures = input<DepartureInfo[]>([]);
  initialEndDate = input<string>('');

  confirmed = output<EndCampaignData>();
  cancelled = output<void>();

  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  // Local State
  leftoverInvitations = signal<'muchas' | 'algunas' | 'pocas' | 'ninguna' | 'faltaron' | ''>('');
  missingInvitations = signal<number | null>(null);
  finalComments = signal('');
  finalEndDate = signal('');
  filteredDepartures = signal<DepartureInfo[]>([]);

  options = [
    { id: 'l-muchas', value: 'muchas', icon: '📦', text: 'Sobraron', bold: 'Muchas' },
    { id: 'l-algunas', value: 'algunas', icon: '📦', text: 'Sobraron', bold: 'Algunas' },
    { id: 'l-pocas', value: 'pocas', icon: '📦', text: 'Sobraron', bold: 'Pocas' },
    { id: 'l-ninguna', value: 'ninguna', icon: '🚫', text: 'No sobró', bold: 'Ninguna' },
    { id: 'l-faltaron', value: 'faltaron', icon: '⚠️', text: 'Faltaron', bold: 'invitaciones' },
  ];

  constructor() {
    effect(
      () => {
        // Sync inputs to local state when modal is opened/updated
        this.filteredDepartures.set([...this.departures()]);
        this.finalEndDate.set(this.initialEndDate());
      },
      { allowSignalWrites: true },
    );
  }

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
    this.cancelled.emit();
  }

  toggleDepartureCheck(index: number): void {
    const list = [...this.filteredDepartures()];
    list[index].checked = !list[index].checked;
    this.filteredDepartures.set(list);
  }

  confirm(): void {
    if (!this.leftoverInvitations()) return;

    const deps = this.filteredDepartures();
    const checkedDeps = deps.filter((d) => d.checked);

    const data: EndCampaignData = {
      leftoverInvitations: this.leftoverInvitations(),
      missingInvitations:
        this.leftoverInvitations() === 'faltaron' ? this.missingInvitations() : null,
      departuresInfo: {
        checkedCount: checkedDeps.length,
        details: checkedDeps,
      },
      finalComments: this.finalComments(),
      finalEndDate: this.finalEndDate(),
    };

    this.dialog().nativeElement.close();
    this.confirmed.emit(data);
  }
}
