import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  isOpen = signal<boolean>(false);

  ngOnInit(): void {}

  openModal() {
    this.isOpen.set(true);
    // Prevenir el scroll en el body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
  }

  hideModal() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    // Redirigir como lo hacía el evento hidden.bs.modal original
    this.router.navigate(['home']);
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }
}
