import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';

declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class TerritoryMapService {
  private map: any = null;
  private kmlLayer: any = null;
  private compassHandler: ((event: DeviceOrientationEvent) => void) | null = null;
  private mapsApiLoaded = false;

  async loadMapsApi(): Promise<void> {
    if (this.mapsApiLoaded) return;

    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        this.mapsApiLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker&v=beta&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.mapsApiLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    });
  }

  async initMap(element: HTMLElement): Promise<any> {
    await this.loadMapsApi();

    const { Map } = await google.maps.importLibrary('maps') as any;
    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as any;

    this.map = new Map(element, {
      center: { lat: -33.787, lng: -61.205 },
      zoom: 16,
      mapId: environment.mapId,
      heading: 0,
      tilt: 0,
      mapTypeId: 'satellite',
      disableDefaultUI: true,
      gestureHandling: 'cooperative',
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      zoomControl: false,
    });

    return this.map;
  }

  async loadKml(map: any, kmlUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const { KmlLayer } = google.maps;

      this.kmlLayer = new KmlLayer({
        url: kmlUrl,
        map: map,
        preserveViewport: true,
        suppressInfoWindows: false,
        zIndex: 10,
      });

      google.maps.event.addListenerOnce(this.kmlLayer, 'status_changed', () => {
        const status = this.kmlLayer.getStatus();
        if (status === 'OK') {
          resolve();
        } else {
          reject(new Error(`KML Layer failed with status: ${status}`));
        }
      });

      setTimeout(() => {
        const status = this.kmlLayer.getStatus();
        if (status !== 'OK') {
          reject(new Error(`KML Layer timeout, status: ${status}`));
        }
      }, 10000);
    });
  }

  setHeading(heading: number): void {
    if (this.map) {
      this.map.setHeading(heading % 360);
    }
  }

  setTilt(tilt: number): void {
    if (this.map) {
      this.map.setTilt(Math.max(0, Math.min(67.5, tilt)));
    }
  }

  setCenter(lat: number, lng: number): void {
    if (this.map) {
      this.map.setCenter({ lat, lng });
    }
  }

  getHeading(): number {
    return this.map?.getHeading() ?? 0;
  }

  enableCompassMode(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('DeviceOrientationEvent' in window)) {
        reject(new Error('DeviceOrientationEvent not supported'));
        return;
      }

      const startListening = () => {
        this.compassHandler = (event: DeviceOrientationEvent) => {
          if (event.alpha !== null && this.map) {
            const heading = 360 - event.alpha;
            this.map.setHeading(heading);
          }
        };
        window.addEventListener('deviceorientation', this.compassHandler);
        resolve();
      };

      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              startListening();
            } else {
              reject(new Error('Permission denied for device orientation'));
            }
          })
          .catch(() => reject(new Error('Permission request failed')));
      } else {
        startListening();
      }
    });
  }

  disableCompassMode(): void {
    if (this.compassHandler !== null) {
      window.removeEventListener('deviceorientation', this.compassHandler);
      this.compassHandler = null;
    }
  }

  createFallbackIframe(container: HTMLElement, iframeHtml: string): void {
    container.innerHTML = iframeHtml;
    const iframe = container.querySelector('iframe');
    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
    }
  }

  destroy(): void {
    this.disableCompassMode();
    if (this.kmlLayer) {
      this.kmlLayer.setMap(null);
      this.kmlLayer = null;
    }
    this.map = null;
  }

  isMapLoaded(): boolean {
    return this.map !== null;
  }
}