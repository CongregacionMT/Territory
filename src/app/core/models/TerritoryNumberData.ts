export interface TerritoryNumberData {
  collection: string;
  territorio: number;
}

export interface TerritoriesNumberData {
  wheelwright: TerritoryNumberData[];
  rural: TerritoryNumberData[];
}
