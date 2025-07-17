import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

declare var window: any;

@Component({
    selector: 'app-modal',
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.scss'],
    imports: [RouterLink]
})
export class ModalComponent implements OnInit {
  private router = inject(Router);

  modalElement: any;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {}

  ngOnInit(): void {
    let modalID = document.getElementById("modalID");
    this.modalElement = new window.bootstrap.Modal(modalID);
    modalID?.addEventListener('hidden.bs.modal', (event: any) => {
      this.router.navigate(['home']);
    });
  }

  openModal(){
    this.modalElement.show();
  }

  hideModal(){
    this.modalElement.hide();
  }
}
