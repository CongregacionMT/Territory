import { Component, OnInit, OnDestroy, input, signal, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as toGeoJSON from '@tmcw/togeojson';
import * as L from 'leaflet';

@Component({
  selector: 'app-offline-map-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-map-viewer.component.html',
  styleUrl: './offline-map-viewer.component.scss'
})
export class OfflineMapViewerComponent implements OnInit, OnDestroy, AfterViewInit {
  kmlUrl = input.required<string>();
  
  loading = signal(true);
  error = signal<string | null>(null);
  
  mapContainer = viewChild.required<ElementRef>('mapContainer');
  private map: L.Map | null = null;
  private watchId: number | null = null;
  private userMarker: L.CircleMarker | null = null;

  ngOnInit(): void {
    // We will load the map in AfterViewInit
  }
  
  ngAfterViewInit(): void {
    this.initMap();
    this.loadKml();
  }
  
  ngOnDestroy(): void {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    this.map = L.map(this.mapContainer().nativeElement, {
      zoomControl: true,
      attributionControl: false
    });

    // Add a default OpenStreetMap tile layer for when online or cached
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);
  }

  async loadKml() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const url = this.kmlUrl().startsWith('http') ? this.kmlUrl() : `${window.location.origin}/${this.kmlUrl()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}: No se pudo cargar el mapa offline`);
      
      const kmlText = await response.text();
      const parser = new DOMParser();
      const kmlDom = parser.parseFromString(kmlText, 'text/xml');
      
      const geoJson = toGeoJSON.kml(kmlDom);
      
      if (this.map && geoJson) {
        // Create GeoJSON layer
        const geoJsonLayer = L.geoJSON(geoJson, {
          style: (feature) => {
            return {
              color: feature?.properties?.stroke || '#1976d2',
              fillColor: feature?.properties?.fill || '#2196f3',
              fillOpacity: 0.4,
              weight: 2
            };
          },
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 6,
              fillColor: feature?.properties?.['marker-color'] || '#ea4335',
              color: '#fff',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.9
            });
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties && feature.properties.name) {
              const isPoint = feature.geometry.type === 'Point';
              layer.bindTooltip(feature.properties.name, {
                permanent: isPoint,
                direction: isPoint ? 'top' : 'center',
                className: 'custom-map-tooltip'
              });
            }
          }
        }).addTo(this.map);

        // Fit map bounds to the geojson features
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [20, 20] });
        }
      }

      this.loading.set(false);
      this.startTracking();
    } catch (err: any) {
      console.error('[OfflineMapViewer] Error cargando KML:', err);
      this.error.set(err.message || 'Error al cargar mapa offline');
      this.loading.set(false);
    }
  }

  startTracking() {
    if (navigator.geolocation && this.map) {
      this.watchId = navigator.geolocation.watchPosition(
        pos => {
          const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
          
          if (!this.userMarker) {
            this.userMarker = L.circleMarker(latlng, {
              radius: 8,
              fillColor: '#4285F4',
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 1
            }).addTo(this.map!);
          } else {
            this.userMarker.setLatLng(latlng);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
  }
}
