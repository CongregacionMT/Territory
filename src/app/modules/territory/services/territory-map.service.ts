import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { MarkerOverride } from '@core/config/maps.types';
import { GoogleMapsLoaderService } from './google-maps-loader.service';
import { TerritoryMapKmlService } from './territory-map-kml.service';
import { UserLocationService } from './user-location.service';

@Injectable({
  providedIn: 'root',
})
export class TerritoryMapService {
  private googleMapsLoader = inject(GoogleMapsLoaderService);
  private kmlService = inject(TerritoryMapKmlService);
  private userLocationService = inject(UserLocationService);

  private map: google.maps.Map | null = null;
  private userLocationMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  private userLocationDot: HTMLElement | null = null;

  async loadMapsApi(): Promise<void> {
    return this.googleMapsLoader.loadMapsApi();
  }

  async initMap(element: HTMLElement): Promise<google.maps.Map> {
    await this.loadMapsApi();

    const { Map } = await google.maps.importLibrary('maps');

    this.map = new Map(element, {
      center: { lat: -33.787, lng: -61.205 },
      zoom: 16,
      mapId: environment.mapId,
      heading: 0,
      tilt: 0,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      gestureHandling: 'cooperative',
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: true,
      zoomControl: false,
    });

    return this.map;
  }

  async loadKml(
    map: google.maps.Map,
    kmlUrl: string,
    markerOverrides?: Record<string, MarkerOverride>,
  ): Promise<void> {
    return this.kmlService.loadKml(map, kmlUrl, markerOverrides);
  }

  async trackUserLocation(): Promise<void> {
    if (!this.map) return;

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

    this.userLocationDot = this.createUserLocationElement();

    this.userLocationMarker = new AdvancedMarkerElement({
      map: this.map,
      content: this.userLocationDot,
      title: 'Tu ubicación actual',
      zIndex: 999,
    });

    this.userLocationService.trackUserLocation((lat, lng) => {
      if (this.userLocationMarker) {
        this.userLocationMarker.position = { lat, lng };
      }
    });
  }

  private createUserLocationElement(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'position:relative;width:44px;height:44px;';

    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position:absolute;top:0;left:0;width:44px;height:44px;
      border-radius:50%;background:rgba(66,133,244,0.2);
      animation:userLocPulse 2s ease-out infinite;
    `;

    const outer = document.createElement('div');
    outer.style.cssText = `
      position:absolute;top:10px;left:10px;width:24px;height:24px;
      border-radius:50%;background:rgba(255,255,255,0.9);
      box-shadow:0 1px 4px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
      width:16px;height:16px;border-radius:50%;
      background:#4285F4;
      box-shadow:0 0 6px rgba(66,133,244,0.6);
    `;

    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position:absolute;top:2px;left:50%;transform:translateX(-50%);
      width:0;height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      border-bottom:10px solid #4285F4;
      filter:drop-shadow(0 -1px 1px rgba(0,0,0,0.2));
    `;

    if (!document.getElementById('user-loc-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'user-loc-pulse-style';
      style.textContent = `
        @keyframes userLocPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    outer.appendChild(inner);
    container.appendChild(pulse);
    container.appendChild(arrow);
    container.appendChild(outer);

    return container;
  }

  async centerOnUser(): Promise<void> {
    if (this.userLocationMarker && this.userLocationMarker.position && this.map) {
      this.map.panTo(this.userLocationMarker.position);
      this.map.setZoom(17);
    } else if (this.map) {
      try {
        const pos = await this.userLocationService.getCurrentPosition();
        this.map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.map.setZoom(17);
      } catch (err) {
        console.warn('Could not center on user:', err);
      }
    }
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
    return this.userLocationService.enableCompassMode((heading) => this.setHeading(heading));
  }

  disableCompassMode(): void {
    this.userLocationService.disableCompassMode();
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
    this.userLocationService.destroy();
    this.kmlService.destroy();
    if (this.userLocationMarker) {
      this.userLocationMarker.map = null;
      this.userLocationMarker = null;
    }
    this.userLocationDot = null;
    this.map = null;
  }

  isMapLoaded(): boolean {
    return this.map !== null;
  }
}
