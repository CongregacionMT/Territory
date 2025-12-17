export interface User {
  user: string;
  password?: string;
  rol?: 'admin' | 'conductor';
  tokens?: string[];
  [key: string]: any; // Allow other properties for now
}
