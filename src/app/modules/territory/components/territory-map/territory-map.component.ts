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
import { CommonModule } from '@angular/common';
import { environment } from '@environments/environment';
import { TerritoryMapService } from '../../services/territory-map.service';
import { mapConfig } from '@core/config/maps.config';

@Component({
  selector: 'app-territory-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './territory-map.component.html',
  styleUrl: './territory-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritoryMapComponent implements OnInit, OnDestroy {
  collection = input.required<string>();
  congregationKey = input.required<string>();

  private mapService = inject(TerritoryMapService);

  mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  compassMode = signal(false);
  heading = signal(0);
  mapLoaded = signal(false);
  useFallback = signal(false);
  error = signal<string | null>(null);

  currentMapConfig = computed(() => {
    return mapConfig?.maps?.[this.collection()];
  });

  ngOnInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.mapService.destroy();
  }

  private async initMap(): Promise<void> {
    const config = this.currentMapConfig();

    if (!config) {
      this.error.set('Mapa no configurado para este territorio');
      return;
    }

    if (config.kmlUrl) {
      try {
        await this.mapService.loadMapsApi();
        const map = await this.mapService.initMap(this.mapContainer().nativeElement);
        const absoluteKmlUrl = config.kmlUrl.startsWith('http')
          ? config.kmlUrl
          : `${window.location.origin}/${config.kmlUrl}`;
        await this.mapService.loadKml(map, absoluteKmlUrl);
        this.mapLoaded.set(true);
        this.startHeadingSync();
      } catch (err) {
        console.error('Error loading KML map:', err);
        this.fallbackToIframe(config);
      }
    } else if (config.iframeHtml) {
      this.fallbackToIframe(config);
    } else {
      this.error.set('Configuración de mapa inválida');
    }
  }

  private fallbackToIframe(config: any): void {
    this.mapService.createFallbackIframe(this.mapContainer().nativeElement, config.iframeHtml);
    this.useFallback.set(true);
    this.mapLoaded.set(true);
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
    this.initMap();
  }
}