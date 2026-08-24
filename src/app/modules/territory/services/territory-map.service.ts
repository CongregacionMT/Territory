import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { MarkerOverride } from '@core/config/maps.types';
import * as toGeoJSON from '@tmcw/togeojson';

declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class TerritoryMapService {
  private map: any = null;
  private compassHandler: ((event: DeviceOrientationEvent) => void) | null = null;
  private mapsApiLoaded = false;

  private userLocationMarker: any = null;
  private userLocationDot: HTMLElement | null = null;
  private watchPositionId: number | null = null;
  private kmlMarkers: any[] = [];

  async loadMapsApi(): Promise<void> {
    if (this.mapsApiLoaded) return;

    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        this.mapsApiLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=marker&v=beta`;
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

    const { Map } = (await google.maps.importLibrary('maps')) as any;

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
    map: any,
    kmlUrl: string,
    markerOverrides?: Record<string, MarkerOverride>,
  ): Promise<void> {
    try {
      const response = await fetch(kmlUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch KML: ${response.statusText}`);
      }

      const kmlText = await response.text();
      const parser = new DOMParser();
      const kmlDom = parser.parseFromString(kmlText, 'text/xml');
      const geoJson = toGeoJSON.kml(kmlDom);

      // Separate Point features from Polygon/LineString features
      const pointFeatures = geoJson.features.filter((f: any) => f.geometry.type === 'Point');
      const nonPointFeatures = {
        ...geoJson,
        features: geoJson.features.filter((f: any) => f.geometry.type !== 'Point'),
      };

      // Add polygons/lines to map.data
      if (nonPointFeatures.features.length > 0) {
        map.data.addGeoJson(nonPointFeatures);
      }

      // Style polygons/lines
      map.data.setStyle((feature: any) => {
        const fill = feature.getProperty('fill') || '#2196f3';
        const stroke = feature.getProperty('stroke') || '#1976d2';
        const fillOpacity = feature.getProperty('fill-opacity') ?? 0.4;
        const strokeOpacity = feature.getProperty('stroke-opacity') ?? 1.0;
        const strokeWidth = feature.getProperty('stroke-width') ?? 2;

        return {
          fillColor: fill,
          fillOpacity: fillOpacity,
          strokeColor: stroke,
          strokeOpacity: strokeOpacity,
          strokeWeight: strokeWidth,
          clickable: true,
        };
      });

      // Create AdvancedMarkerElements for Point features
      const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary(
        'marker',
      )) as any;

      const infoWindow = new google.maps.InfoWindow();

      for (const feature of pointFeatures) {
        const coords = (feature.geometry as any).coordinates;
        const [lng, lat] = coords;
        const name = feature.properties?.['name'] || '';
        const iconColor = feature.properties?.['icon-color'] || '#ea4335';
        const override = markerOverrides?.[name];

        let markerContent: HTMLElement;

        if (override?.iconUrl) {
          // Circular photo marker
          markerContent = this.createImageMarker(override.iconUrl, name);
        } else {
          // PinElement with optional color/label override
          // Automagically extract number from name (e.g. "Punto 2" -> "2", "1" -> "1")
          const numberMatch = name.match(/\d+/);
          const defaultGlyph = numberMatch ? numberMatch[0] : undefined;

          // Use a friendly blue color for numbered markers if no override is provided, otherwise fallback to KML color
          const bg = override?.color ?? (defaultGlyph ? '#1a73e8' : iconColor);

          const pin = new PinElement({
            background: bg,
            borderColor: this.darkenColor(bg, 0.3),
            glyphColor: '#FFFFFF',
            glyph: override?.label ?? defaultGlyph,
            scale: 1.1,
          });
          markerContent = pin.element;
        }

        const marker = new AdvancedMarkerElement({
          map: map,
          position: { lat, lng },
          content: markerContent,
          title: name,
        });

        // Info window on click
        marker.addListener('click', () => {
          if (name) {
            infoWindow.setContent(
              `<div style="padding:4px 8px;"><strong style="font-size:14px;">${name}</strong></div>`,
            );
            infoWindow.open(map, marker);
          }
        });

        this.kmlMarkers.push(marker);
      }

      // Info window for polygons too
      map.data.addListener('click', (event: any) => {
        const name = event.feature.getProperty('name');
        if (name) {
          infoWindow.setContent(
            `<div style="padding:4px 8px;"><strong style="font-size:14px;">${name}</strong></div>`,
          );
          infoWindow.setPosition(event.latLng);
          infoWindow.open(map);
        }
      });

      // Fit bounds to show all loaded data
      const bounds = new google.maps.LatLngBounds();
      map.data.forEach((feature: any) => {
        const geometry = feature.getGeometry();
        geometry.forEachLatLng((latLng: any) => {
          bounds.extend(latLng);
        });
      });
      for (const marker of this.kmlMarkers) {
        bounds.extend(marker.position);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
      }
    } catch (err) {
      console.error('Error in local KML parsing:', err);
      throw err;
    }
  }

  /** Create an HTMLElement containing a circular image for a marker */
  private createImageMarker(url: string, title: string): HTMLElement {
    const container = document.createElement('div');
    container.style.width = '36px';
    container.style.height = '36px';
    container.style.borderRadius = '50%';
    container.style.overflow = 'hidden';
    container.style.border = '2px solid white';
    container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    container.style.backgroundColor = '#f0f0f0';
    container.title = title;

    const img = document.createElement('img');
    img.src = url;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';

    container.appendChild(img);
    return container;
  }

  /** Darken a hex color by a factor (0 to 1) */
  private darkenColor(hex: string, factor: number): string {
    const h = hex.replace('#', '');
    const r = Math.max(0, Math.round(parseInt(h.substring(0, 2), 16) * (1 - factor)));
    const g = Math.max(0, Math.round(parseInt(h.substring(2, 4), 16) * (1 - factor)));
    const b = Math.max(0, Math.round(parseInt(h.substring(4, 6), 16) * (1 - factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  async trackUserLocation(): Promise<void> {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    if (!this.map) return;

    const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as any;

    // Create pulsing blue dot element
    this.userLocationDot = this.createUserLocationElement();

    this.userLocationMarker = new AdvancedMarkerElement({
      map: this.map,
      content: this.userLocationDot,
      title: 'Tu ubicación actual',
      zIndex: 999,
    });

    this.watchPositionId = navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (this.userLocationMarker) {
          this.userLocationMarker.position = pos;
        }
      },
      (error) => {
        console.error('Error obtaining user location:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      },
    );
  }

  /** Creates a pulsing blue dot HTML element for user location */
  private createUserLocationElement(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'position:relative;width:44px;height:44px;';

    // Pulsing ring
    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position:absolute;top:0;left:0;width:44px;height:44px;
      border-radius:50%;background:rgba(66,133,244,0.2);
      animation:userLocPulse 2s ease-out infinite;
    `;

    // Outer ring
    const outer = document.createElement('div');
    outer.style.cssText = `
      position:absolute;top:10px;left:10px;width:24px;height:24px;
      border-radius:50%;background:rgba(255,255,255,0.9);
      box-shadow:0 1px 4px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    `;

    // Inner blue dot
    const inner = document.createElement('div');
    inner.style.cssText = `
      width:16px;height:16px;border-radius:50%;
      background:#4285F4;
      box-shadow:0 0 6px rgba(66,133,244,0.6);
    `;

    // Direction arrow
    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position:absolute;top:2px;left:50%;transform:translateX(-50%);
      width:0;height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      border-bottom:10px solid #4285F4;
      filter:drop-shadow(0 -1px 1px rgba(0,0,0,0.2));
    `;

    // Inject the keyframe animation into the page (only once)
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

  centerOnUser(): void {
    if (this.userLocationMarker && this.userLocationMarker.position && this.map) {
      this.map.panTo(this.userLocationMarker.position);
      this.map.setZoom(17);
    } else {
      if (navigator.geolocation && this.map) {
        navigator.geolocation.getCurrentPosition((pos) => {
          this.map.panTo({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          this.map.setZoom(17);
        });
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
        (DeviceOrientationEvent as any)
          .requestPermission()
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
    if (this.watchPositionId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
    if (this.userLocationMarker) {
      this.userLocationMarker.map = null;
      this.userLocationMarker = null;
    }
    this.userLocationDot = null;
    // Clean up KML markers
    for (const marker of this.kmlMarkers) {
      marker.map = null;
    }
    this.kmlMarkers = [];
    this.map = null;
  }

  isMapLoaded(): boolean {
    return this.map !== null;
  }
}
