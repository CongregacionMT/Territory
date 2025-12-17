import { InjectionToken } from '@angular/core';

export interface MapConfig {
  maps: Record<string, string>;
}

export const MAP_CONFIG = new InjectionToken<MapConfig>('MAP_CONFIG');
