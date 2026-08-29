import { Injectable } from '@angular/core';
import { MarkerOverride } from '@core/config/maps.types';
import * as toGeoJSON from '@tmcw/togeojson';

@Injectable({
  providedIn: 'root',
})
export class TerritoryMapKmlService {
  private kmlMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

  async loadKml(
    map: google.maps.Map,
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

      const pointFeatures = geoJson.features.filter(
        (f): f is GeoJSON.Feature<GeoJSON.Point> =>
          f.geometry !== null && f.geometry.type === 'Point',
      );
      const nonPointFeatures = {
        ...geoJson,
        features: geoJson.features.filter((f) => !f.geometry || f.geometry.type !== 'Point'),
      };

      if (nonPointFeatures.features.length > 0) {
        map.data.addGeoJson(nonPointFeatures);
      }

      map.data.setStyle((feature: google.maps.Data.Feature) => {
        const fill = (feature.getProperty('fill') as string) || '#2196f3';
        const stroke = (feature.getProperty('stroke') as string) || '#1976d2';
        const fillOpacity = (feature.getProperty('fill-opacity') as number) ?? 0.4;
        const strokeOpacity = (feature.getProperty('stroke-opacity') as number) ?? 1.0;
        const strokeWidth = (feature.getProperty('stroke-width') as number) ?? 2;

        return {
          fillColor: fill,
          fillOpacity: fillOpacity,
          strokeColor: stroke,
          strokeOpacity: strokeOpacity,
          strokeWeight: strokeWidth,
          clickable: true,
        };
      });

      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');

      const infoWindow = new google.maps.InfoWindow();

      for (const feature of pointFeatures) {
        const coords = feature.geometry.coordinates;
        const [lng, lat] = coords;
        const name = (feature.properties?.['name'] as string) || '';
        const iconColor = (feature.properties?.['icon-color'] as string) || '#ea4335';
        const override = markerOverrides?.[name];

        let markerContent: HTMLElement;

        if (override?.iconUrl) {
          markerContent = this.createImageMarker(override.iconUrl, name);
        } else {
          const numberMatch = name.match(/\d+/);
          const defaultGlyph = numberMatch ? numberMatch[0] : undefined;
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

      map.data.addListener('click', (event: google.maps.Data.MouseEvent) => {
        const name = event.feature.getProperty('name') as string;
        if (name) {
          infoWindow.setContent(
            `<div style="padding:4px 8px;"><strong style="font-size:14px;">${name}</strong></div>`,
          );
          infoWindow.setPosition(event.latLng);
          infoWindow.open(map);
        }
      });

      const bounds = new google.maps.LatLngBounds();
      map.data.forEach((feature: google.maps.Data.Feature) => {
        const geometry = feature.getGeometry();
        if (geometry) {
          geometry.forEachLatLng((latLng: google.maps.LatLng) => {
            bounds.extend(latLng);
          });
        }
      });
      for (const marker of this.kmlMarkers) {
        bounds.extend(marker.position as google.maps.LatLngLiteral);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
      }
    } catch (err) {
      console.error('Error in local KML parsing:', err);
      throw err;
    }
  }

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

  private darkenColor(hex: string, factor: number): string {
    const h = hex.replace('#', '');
    const r = Math.max(0, Math.round(parseInt(h.substring(0, 2), 16) * (1 - factor)));
    const g = Math.max(0, Math.round(parseInt(h.substring(2, 4), 16) * (1 - factor)));
    const b = Math.max(0, Math.round(parseInt(h.substring(4, 6), 16) * (1 - factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  destroy(): void {
    for (const marker of this.kmlMarkers) {
      marker.map = null;
    }
    this.kmlMarkers = [];
  }
}
