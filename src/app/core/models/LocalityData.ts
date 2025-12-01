import { TerritoryNumberData } from './TerritoryNumberData';

export interface LocalityData {
  key: string;           // 'mariaTeresa', 'christophersen', 'rural'
  name: string;          // 'María Teresa', 'Christophersen', 'Rural'
  territoryPrefix: string; // 'TerritorioMT', 'TerritorioC', 'TerritorioR'
  territories: TerritoryNumberData[];
  mapSrc?: string;       // URL de la imagen del mapa (si está disponible)
  hasNumberedTerritories: boolean; // true para MT y C, false para Rural
}

export interface LocalityConfig {
  key: string;
  name: string;
  territoryPrefix: string;
  hasNumberedTerritories: boolean;
}
