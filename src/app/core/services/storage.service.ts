import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Obtiene un elemento del sessionStorage y lo parsea a JSON.
   */
  getItem<T>(key: string): T | null {
    if (!this.isBrowser) return null;
    try {
      const item = sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch (error) {
      console.error(`Error parsing item from sessionStorage with key: ${key}`, error);
      return null;
    }
  }

  /**
   * Guarda un elemento en el sessionStorage.
   */
  setItem<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    try {
      const stringValue = JSON.stringify(value);
      sessionStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Error stringifying item to sessionStorage with key: ${key}`, error);
    }
  }

  /**
   * Elimina un elemento del sessionStorage.
   */
  removeItem(key: string): void {
    if (!this.isBrowser) return;
    sessionStorage.removeItem(key);
  }

  /**
   * Limpia todo el sessionStorage.
   */
  clear(): void {
    if (!this.isBrowser) return;
    sessionStorage.clear();
  }
}
