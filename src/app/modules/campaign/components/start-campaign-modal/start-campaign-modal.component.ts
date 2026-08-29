import { Component, output, ChangeDetectionStrategy, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-start-campaign-modal',
  standalone: true,
  templateUrl: './start-campaign-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartCampaignModalComponent {
  confirmed = output<void>();
  cancelled = output<void>();

  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
    this.cancelled.emit();
  }

  confirm(): void {
    this.dialog().nativeElement.close();
    this.confirmed.emit();
  }
}
