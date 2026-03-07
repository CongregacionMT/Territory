export interface CampaignStats {
  done: number;
  total: number;
  percent: number;
  completedTerritories?: number;
  totalTerritories?: number;
  progressHistory?: { date: string; percent: number }[];
  lastUpdate?: any;
  salidas?: number;
  territoryNumber?: number;
  avgPerTerritory?: number;
}

export interface DeparturesInfo {
  checkedCount: number;
  totalPublishers: number;
  details: {
    id: string;
    date: string;
    checked: boolean;
    publishers?: number;
  }[];
}

export interface Campaign {
  id?: string;
  name: string;
  description: string;
  dateEnd: any;
  dateInit: any;
  active: boolean;
  initialInvitations?: number;
  leftoverInvitations?: 'muchas' | 'algunas' | 'pocas' | 'ninguna' | '';
  departuresInfo?: DeparturesInfo;
  stats: {
    global: CampaignStats;
    [key: string]: CampaignStats;
  };
}
