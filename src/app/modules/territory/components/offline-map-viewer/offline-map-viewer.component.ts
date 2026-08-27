import {
  Component,
  OnDestroy,
  input,
  signal,
  ElementRef,
  viewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
} from '@angular/core';

import type * as L from 'leaflet';

interface KmlFeatureProperties {
  stroke?: string;
  fill?: string;
  'marker-color'?: string;
  name?: string;
}

@Component({
  selector: 'app-offline-map-viewer',
  standalone: true,
  imports: [],
  templateUrl: './offline-map-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './offline-map-viewer.component.scss',
})
export class OfflineMapViewerComponent implements AfterViewInit, OnDestroy {
  kmlUrl = input.required<string>();

  loading = signal(true);
  error = signal<string | null>(null);

  mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private map: L.Map | null = null;
  private watchId: number | null = null;
  private userMarker: L.CircleMarker | null = null;

  ngAfterViewInit(): void {
    void this.initMap().then(() => this.loadKml());
  }

  ngOnDestroy(): void {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.map) {
      this.map.remove();
    }
  }

  private async initMap(): Promise<void> {
    const L = await import('leaflet');
    this.map = L.map(this.mapContainer().nativeElement, {
      zoomControl: true,
      attributionControl: false,
    });

    // Add a default OpenStreetMap tile layer for when online or cached
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);
  }

  async loadKml(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const L = await import('leaflet');
      const toGeoJSON = await import('@tmcw/togeojson');
      const url = this.kmlUrl().startsWith('http')
        ? this.kmlUrl()
        : `${window.location.origin}/${this.kmlUrl()}`;

      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP Error ${response.status}: No se pudo cargar el mapa offline`);

      const kmlText = await response.text();
      const parser = new DOMParser();
      const kmlDom = parser.parseFromString(kmlText, 'text/xml');

      const geoJson = toGeoJSON.kml(kmlDom);

      if (this.map && geoJson) {
        // Create GeoJSON layer
        const geoJsonLayer = L.geoJSON(geoJson, {
          style: (feature) => {
            const props = feature?.properties as KmlFeatureProperties | undefined;
            return {
              color: props?.stroke || '#1976d2',
              fillColor: props?.fill || '#2196f3',
              fillOpacity: 0.4,
              weight: 2,
            };
          },
          pointToLayer: (feature, latlng) => {
            const props = feature.properties as KmlFeatureProperties | undefined;
            return L.circleMarker(latlng, {
              radius: 6,
              fillColor: props?.['marker-color'] || '#ea4335',
              color: '#fff',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.9,
            });
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties as KmlFeatureProperties | undefined;
            if (props?.name) {
              const isPoint = feature.geometry.type === 'Point';
              layer.bindTooltip(props.name, {
                permanent: isPoint,
                direction: isPoint ? 'top' : 'center',
                className: 'custom-map-tooltip',
              });
            }
          },
        }).addTo(this.map);

        // Fit map bounds to the geojson features
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [20, 20] });
        }
      }

      this.loading.set(false);
      void this.startTracking();
    } catch (err: unknown) {
      console.error('[OfflineMapViewer] Error cargando KML:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar mapa offline';
      this.error.set(errorMessage);
      this.loading.set(false);
    }
  }

  async startTracking(): Promise<void> {
    if (navigator.geolocation && this.map) {
      const activeMap = this.map;
      const L = await import('leaflet');
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);

          if (!this.userMarker) {
            this.userMarker = L.circleMarker(latlng, {
              radius: 8,
              fillColor: '#4285F4',
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 1,
            }).addTo(activeMap);
          } else {
            this.userMarker.setLatLng(latlng);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 },
      );
    }
  }
}
