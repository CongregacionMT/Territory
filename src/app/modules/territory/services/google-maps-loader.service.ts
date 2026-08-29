import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  private mapsApiLoaded = false;
  private loadPromise: Promise<void> | null = null;

  async loadMapsApi(): Promise<void> {
    if (this.mapsApiLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        this.mapsApiLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker&v=beta`;
      script.async = true;
      script.defer = true;
      script.onload = (): void => {
        this.mapsApiLoaded = true;
        resolve();
      };
      script.onerror = (): void => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}
