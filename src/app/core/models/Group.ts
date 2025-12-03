export interface Publisher {
  name: string;
  assignment?: 'Superintendente' | 'Auxiliar' | '';
}

export interface Group {
  id: string;
  publishers: Publisher[];
}
