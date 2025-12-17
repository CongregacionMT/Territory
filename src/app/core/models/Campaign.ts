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

export interface Campaign {
  id?: string;
  name: string;
  description: string;
  dateEnd: any;
  dateInit: any;
  active: boolean;
  stats: {
    global: CampaignStats;
    [key: string]: CampaignStats;
  };
}
