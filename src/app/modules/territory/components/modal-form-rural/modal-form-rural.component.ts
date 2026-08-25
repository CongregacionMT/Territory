import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataRural } from '@core/models/DataRural';
import { FormRuralComponent } from '../form-rural/form-rural.component';

declare let window: Window &
  typeof globalThis & {
    bootstrap: { Modal: new (el: HTMLElement | null) => { show: () => void; hide: () => void } };
  };

@Component({
  selector: 'app-modal-form-rural',
  templateUrl: './modal-form-rural.component.html',
  styleUrls: ['./modal-form-rural.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormRuralComponent],
})
export class ModalFormRuralComponent implements OnInit {
  private router = inject(Router);

  modalElement: { show: () => void; hide: () => void } | undefined;
  stateModal = signal<'open' | 'close'>('close');
  title = signal<string>('Crear camino');
  editionForm = signal<DataRural | undefined>(undefined);
  constructor() {}

  ngOnInit(): void {
    const modalID = document.getElementById('modalID');
    this.modalElement = new window.bootstrap.Modal(modalID);
    modalID?.addEventListener('hidden.bs.modal', () => {
      this.stateModal.set('close');
      this.editionForm.set(undefined);
    });
  }

  openModalCreation(): void {
    this.modalElement?.show();
    this.title.set('Crear camino');
    this.stateModal.set('open');
  }

  openModalEdition(form: DataRural | undefined): void {
    this.modalElement?.show();
    this.title.set('Editar camino');
    this.editionForm.set(form);
    this.stateModal.set('open');
  }

  hideModal(): void {
    this.modalElement?.hide();
  }
}
