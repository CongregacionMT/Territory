import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DataRural } from '@core/models/DataRural';
import { FormRuralComponent } from '../form-rural/form-rural.component';

declare var window: Window & typeof globalThis & { bootstrap: { Modal: new (el: HTMLElement | null) => { show: () => void; hide: () => void; } } };

@Component({
  selector: 'app-modal-form-rural',
  templateUrl: './modal-form-rural.component.html',
  styleUrls: ['./modal-form-rural.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormRuralComponent],
})
export class ModalFormRuralComponent implements OnInit {
  private router = inject(Router);

  modalElement: { show: () => void; hide: () => void; } | undefined;
  stateModal: 'open' | 'close' = 'close';
  title: string = 'Crear camino';
  editionForm: DataRural | undefined;
  constructor() {}

  ngOnInit(): void {
    let modalID = document.getElementById('modalID');
    this.modalElement = new window.bootstrap.Modal(modalID);
    modalID?.addEventListener('hidden.bs.modal', (event: Event) => {
      this.stateModal = 'close';
      this.editionForm = undefined;
    });
  }

  openModalCreation() {
    this.modalElement?.show();
    this.title = 'Crear camino';
    this.stateModal = 'open';
  }

  openModalEdition(form: DataRural | undefined) {
    this.modalElement?.show();
    this.title = 'Editar camino';
    this.editionForm = form;
    this.stateModal = 'open';
  }

  hideModal() {
    this.modalElement?.hide();
  }
}
