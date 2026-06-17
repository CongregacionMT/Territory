import { InjectionToken } from '@angular/core';

export interface MapConfig {
  maps: Record<string, {
    kmlUrl?: string;
    iframeHtml?: string;
    center?: { lat: number; lng: number };
    zoom?: number;
  }>;
}

export const MAP_CONFIG = new InjectionToken<MapConfig>('MAP_CONFIG');
