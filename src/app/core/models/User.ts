export interface User {
  user: string;
  password?: string;
  rol?: 'admin' | 'conductor';
  tokens?: string[];

}
