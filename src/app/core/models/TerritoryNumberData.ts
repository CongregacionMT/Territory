export interface TerritoryNumberData {
  collection: string;
  territorio: number;
}

export interface TerritoriesNumberData {
  [key: string]: TerritoryNumberData[];
  wheelwright: TerritoryNumberData[];
  rural: TerritoryNumberData[];
}
