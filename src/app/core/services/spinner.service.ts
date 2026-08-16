import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {
  isLoading = signal<boolean>(false);

  cargarSpinner() {
    this.isLoading.set(true);
  }

  cerrarSpinner() {
    this.isLoading.set(false);
  }
}