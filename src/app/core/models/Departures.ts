export type DepartureCardStatus = 'pending' | 'received' | 'not_required';

export interface Departure {
  departureId?: string;
  driver: string;
  location: string;
  territory: string[];
  date: string;
  maps: string;
  point: string;
  schedule: string;
  color: string;
  group: number;
  isEvent?: boolean;
  title?: string;
  cardStatus?: DepartureCardStatus;
}

export interface DepartureData {
  departure: Departure[];
}

export interface DateDeparture {
  date: string;
}

export interface WeeklyDeparture extends DepartureData {
  id?: string;
  weekId: string; // Formato YYYY-MM-DD o YYYY-Www
  createdAt?: any;
}
