export interface User {
  user: string;
  displayName?: string;
  password?: string;
  rol?: 'admin' | 'conductor';
  tokens?: string[];
}
