import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

declare var window: any;

@Component({
    selector: 'app-modal',
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.scss'],
    imports: [RouterLink]
})
export class ModalComponent implements OnInit {
  modalElement: any;
  constructor(private router: Router) {}

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
