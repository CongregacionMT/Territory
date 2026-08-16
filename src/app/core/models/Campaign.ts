export interface CampaignStats {
  done: number;
  total: number;
  percent: number;
  completedTerritories?: number;
  totalTerritories?: number;
  progressHistory?: { date: string; percent: number }[];
  lastUpdate?: Date | string | number;
  salidas?: number;
  territoryNumber?: number;
  avgPerTerritory?: number;
}

export interface DeparturesInfo {
  checkedCount: number;
  totalPublishers?: number;
  details: {
    id: string;
    date: string;
    checked: boolean;
  }[];
}

export interface Campaign {
  id?: string;
  name: string;
  description: string;
  dateEnd: Date | string | number;
  dateInit: Date | string | number;
  active: boolean;
  initialInvitations?: number;
  leftoverInvitations?: 'muchas' | 'algunas' | 'pocas' | 'ninguna' | '';
  departuresInfo?: DeparturesInfo;
  stats: {
    global: CampaignStats;
    [key: string]: CampaignStats;
  };
}
