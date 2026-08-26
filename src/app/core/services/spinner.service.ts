import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  isLoading = signal<boolean>(false);

  cargarSpinner(): void {
    this.isLoading.set(true);
  }

  cerrarSpinner(): void {
    this.isLoading.set(false);
  }
}
