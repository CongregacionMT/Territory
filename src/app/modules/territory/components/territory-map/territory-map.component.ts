import {
  Component,
  OnInit,
  OnDestroy,
  input,
  viewChild,
  signal,
  computed,
  inject,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';

import { environment } from '@environments/environment';
import { TerritoryMapService } from '../../services/territory-map.service';
import { mapConfig } from '@core/config/maps.config';
import { NetworkService } from '@core/services/network.service';
import { OfflineMapViewerComponent } from '../offline-map-viewer/offline-map-viewer.component';

@Component({
  selector: 'app-territory-map',
  standalone: true,
  imports: [OfflineMapViewerComponent],
  templateUrl: './territory-map.component.html',
  styleUrl: './territory-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritoryMapComponent implements OnInit, OnDestroy {
  collection = input.required<string>();
  congregationKey = input.required<string>();

  private mapService = inject(TerritoryMapService);
  public networkService = inject(NetworkService);

  mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  compassMode = signal(false);
  heading = signal(0);
  mapLoaded = signal(false);
  useFallback = signal(false);
  useOfflineViewer = signal(false);
  isFullscreen = signal(false);
  error = signal<string | null>(null);

  currentMapConfig = computed(() => {
    return mapConfig?.maps?.[this.collection()];
  });

  ngOnInit(): void {
    this.initMap();
    
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen.set(!!document.fullscreenElement);
    });
  }

  ngOnDestroy(): void {
    this.mapService.destroy();
  }

  private async initMap(): Promise<void> {
    const config = this.currentMapConfig();
    console.log('[TerritoryMapComponent] initMap invocado. Config:', config);
    console.log('[TerritoryMapComponent] Estado de red detectado (online):', this.networkService.isOnline());

    if (!config) {
      console.warn('[TerritoryMapComponent] Mapa no configurado para este territorio.');
      this.error.set('Mapa no configurado para este territorio');
      return;
    }

    if (config.kmlUrl) {
      try {
        console.log('[TerritoryMapComponent] Intentando inicializar Google Maps dinámico...');
        await this.mapService.loadMapsApi();
        const map = await this.mapService.initMap(this.mapContainer().nativeElement);
        const absoluteKmlUrl = config.kmlUrl.startsWith('http')
          ? config.kmlUrl
          : `${window.location.origin}/${config.kmlUrl}`;
        console.log('[TerritoryMapComponent] Cargando KML en Google Map:', absoluteKmlUrl);
        await this.mapService.loadKml(map, absoluteKmlUrl, config.markerOverrides);
        this.mapLoaded.set(true);
        this.startHeadingSync();
        this.mapService.trackUserLocation();
        console.log('[TerritoryMapComponent] Google Map dinámico cargado con éxito.');
      } catch (err) {
        console.error('[TerritoryMapComponent] Error al inicializar mapa de Google dinámico, ejecutando fallback:', err);
        this.fallbackToIframeOrOffline(config);
      }
    } else if (config.iframeHtml) {
      console.log('[TerritoryMapComponent] No hay kmlUrl, cargando fallback a iframe directo.');
      this.fallbackToIframeOrOffline(config);
    } else {
      console.warn('[TerritoryMapComponent] Configuración de mapa inválida.');
      this.error.set('Configuración de mapa inválida');
    }
  }

  private fallbackToIframeOrOffline(config: any): void {
    console.log('[TerritoryMapComponent] fallbackToIframeOrOffline invocado. Online:', this.networkService.isOnline());
    if (this.networkService.isOnline()) {
      if (config.iframeHtml) {
        console.log('[TerritoryMapComponent] Dispositivo ONLINE. Cargando Iframe fallback.');
        this.mapService.createFallbackIframe(this.mapContainer().nativeElement, config.iframeHtml);
        this.useFallback.set(true);
      } else {
        console.warn('[TerritoryMapComponent] Dispositivo ONLINE pero no hay iframeHtml configurado.');
      }
    } else {
      // Offline: use offline viewer if KML exists
      console.log('[TerritoryMapComponent] Dispositivo OFFLINE. Intentando activar visor offline con KML...');
      if (config.kmlUrl) {
        console.log('[TerritoryMapComponent] Activando visor offline para KML:', config.kmlUrl);
        this.useOfflineViewer.set(true);
      } else {
        console.error('[TerritoryMapComponent] Dispositivo OFFLINE pero no hay kmlUrl configurado para fallback.');
        this.error.set('Mapa offline no disponible para este territorio');
      }
    }
    this.mapLoaded.set(true);
  }

  switchToFallback(): void {
    const config = this.currentMapConfig();
    if (config) {
      this.fallbackToIframeOrOffline(config);
    }
  }

  private startHeadingSync(): void {
    setInterval(() => {
      if (this.mapService.isMapLoaded() && !this.compassMode()) {
        this.heading.set(Math.round(this.mapService.getHeading()));
      }
    }, 100);
  }

  async toggleCompass(): Promise<void> {
    if (this.useFallback()) return;

    if (!this.compassMode()) {
      try {
        await this.mapService.enableCompassMode();
        this.compassMode.set(true);
      } catch (err) {
        console.warn('Compass mode not available:', err);
        this.error.set('Brújula no disponible en este dispositivo');
        setTimeout(() => this.error.set(null), 3000);
      }
    } else {
      this.mapService.disableCompassMode();
      this.compassMode.set(false);
    }
  }

  rotate(degrees: number): void {
    if (this.useFallback()) return;
    const newHeading = (this.mapService.getHeading() + degrees) % 360;
    this.mapService.setHeading(newHeading);
    this.heading.set(Math.round(newHeading));
  }

  centerOnMe(): void {
    this.mapService.centerOnUser();
  }

  toggleFullscreen(): void {
    const elem = this.mapContainer().nativeElement;
    
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
      this.isFullscreen.set(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      this.isFullscreen.set(false);
    }
  }

  getHeadingLabel(): string {
    const h = this.heading() % 360;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const index = Math.round(h / 45) % 8;
    return directions[index];
  }

  retry(): void {
    this.error.set(null);
    this.mapLoaded.set(false);
    this.useFallback.set(false);
    this.useOfflineViewer.set(false);
    this.initMap();
  }
}