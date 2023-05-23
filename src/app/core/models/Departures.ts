export interface Departure {
  driver: string;
  territory: string;
  date: string;
  point: string;
  schedule: string;
  color: string;
  group: number;
}

export interface DepartureData {
  departure: Departure[];
}
