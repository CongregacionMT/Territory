import { InjectionToken } from '@angular/core';

/**
 * Override per-marker appearance by the marker's name (as defined in the KML Placemark <name> tag).
 * - iconUrl: absolute or relative URL to an image (jpg, png, etc.)
 * - color: hex color string (e.g. '#e91e63') — used if no iconUrl is provided
 * - label: optional short label shown inside the pin glyph
 */
export interface MarkerOverride {
  iconUrl?: string;
  color?: string;
  label?: string;
}

export interface MapConfig {
  maps: Record<string, {
    kmlUrl?: string;
    iframeHtml?: string;
    center?: { lat: number; lng: number };
    zoom?: number;

    /** Key = exact Placemark name in the KML. Value = override config. */
    markerOverrides?: Record<string, MarkerOverride>;
  }>;
}

export const MAP_CONFIG = new InjectionToken<MapConfig>('MAP_CONFIG');
