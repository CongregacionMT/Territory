import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NetworkService implements OnDestroy {
  public isOnline = signal<boolean>(navigator.onLine);
  
  private onlineHandler = () => {
    console.log('[NetworkService] Dispositivo cambió a ONLINE');
    this.isOnline.set(true);
  };
  private offlineHandler = () => {
    console.log('[NetworkService] Dispositivo cambió a OFFLINE');
    this.isOnline.set(false);
  };

  constructor() {
    console.log('[NetworkService] Inicializado. Estado inicial online:', this.isOnline());
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  ngOnDestroy(): void {
    console.log('[NetworkService] Destruido');
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }
}
