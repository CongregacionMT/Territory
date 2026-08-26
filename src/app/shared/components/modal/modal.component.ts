import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  private router = inject(Router);

  isOpen = signal<boolean>(false);

  openModal(): void {
    this.isOpen.set(true);
    // Prevenir el scroll en el body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
  }

  async hideModal(): Promise<void> {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    // Redirigir como lo hacía el evento hidden.bs.modal original
    await this.router.navigate(['home']);
  }
}
