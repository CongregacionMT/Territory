import { Injectable, inject } from '@angular/core';
import { TerritoryDataService } from './territory-data.service';
import { Card } from '../models/Card';
import { environment } from '@environments/environment';
import { take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TerritoryPriorityService {
  private territoryDataService = inject(TerritoryDataService);

  // Cache for territory last completed days
  // Maps location prefix -> territory number -> days since last completion
  public territoryLastCompletedDays: { [locationPrefix: string]: { [num: number]: number } } = {};

  private localities = environment.localities;

  /**
   * Initializes the cache of territory completion data
   * @param data The raw territory data grouped by location
   */
  async loadAllTerritoryCompletionData(data: Record<string, unknown>): Promise<void> {
    const promises = [];
    for (const loc of this.localities) {
      if (loc.hasNumberedTerritories) {
        const rawData = (data[loc.key] as unknown[]) || [];
        const territories = rawData.filter(
          (t: unknown) => t && typeof t === 'object' && 'collection' in t && 'territorio' in t,
        );
        if (territories.length > 0) {
          promises.push(this.loadTerritoryCompletionData(loc, territories));
        }
      }
    }
    await Promise.all(promises);
  }

  private async loadTerritoryCompletionData(
    loc: { territoryPrefix: string; key: string; hasNumberedTerritories: boolean },
    territories: unknown[],
  ): Promise<void> {
    const locationPrefix = loc.territoryPrefix;
    if (!this.territoryLastCompletedDays[locationPrefix]) {
      this.territoryLastCompletedDays[locationPrefix] = {};
    }

    const path = loc.key;
    const suffix = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, '');

    const storageKeys = [
      `statisticData${suffix}_6`,
      `statisticData${suffix}_12`,
      `statisticData${suffix}_24`,
    ];
    for (const key of storageKeys) {
      const cachedData = sessionStorage.getItem(key);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData) as Card[][];
          parsedData.forEach((territoryCards: Card[]) => {
            if (territoryCards && territoryCards.length > 0) {
              const primaryCard = territoryCards[0];
              const num = primaryCard.numberTerritory || primaryCard.territory;
              if (num !== undefined) {
                let lastEnd = null;
                for (let i = 0; i < 6 && i < territoryCards.length; i++) {
                  if (territoryCards[i].end) {
                    lastEnd = territoryCards[i].end;
                    break;
                  }
                }

                this.territoryLastCompletedDays[locationPrefix][Number(num)] =
                  this.calculateDaysSince(lastEnd);
              }
            }
          });
          return;
        } catch (e: unknown) {
          console.error('Error parsing session storage', e);
        }
      }
    }

    // If not in session storage, fetch from Firestore
    const promises = (territories as { collection: string; territorio: number }[]).map(
      (t) =>
        new Promise<void>((resolve) => {
          this.territoryDataService
            .getCardTerritorie(t.collection, 120)
            .pipe(take(1))
            .subscribe((cards) => {
              let lastEnd = null;
              for (const c of cards) {
                if (c.end) {
                  lastEnd = c.end;
                  break;
                }
              }
              this.territoryLastCompletedDays[locationPrefix][t.territorio] =
                this.calculateDaysSince(lastEnd);
              resolve();
            });
        }),
    );
    await Promise.all(promises);
  }

  private calculateDaysSince(lastEnd: unknown): number {
    if (!lastEnd) {
      return Infinity;
    }
    const today = new Date();
    const dateToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let dateCard: Date;
    if (typeof lastEnd === 'string' || typeof lastEnd === 'number') {
      dateCard = new Date(lastEnd);
    } else if (lastEnd && typeof (lastEnd as { toDate?: () => Date }).toDate === 'function') {
      dateCard = (lastEnd as unknown as { toDate: () => Date }).toDate();
    } else if (lastEnd && typeof (lastEnd as { seconds?: number }).seconds === 'number') {
      dateCard = new Date((lastEnd as unknown as { seconds: number }).seconds * 1000);
    } else {
      dateCard = new Date(lastEnd as string);
    }

    if (!isNaN(dateCard.getTime())) {
      const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
      return Math.floor(difference / (1000 * 60 * 60 * 24));
    } else {
      return Infinity;
    }
  }

  public getLocationNames(locationPrefix: string): string[] {
    const location = String(locationPrefix || '').toLowerCase();
    const locality = this.localities.find(
      (loc) =>
        String(loc.territoryPrefix || '').toLowerCase() === location ||
        String(loc.key || '').toLowerCase() === location ||
        String(loc.name || '').toLowerCase() === location,
    );

    return [
      location,
      String(locality?.key || '').toLowerCase(),
      String(locality?.name || '').toLowerCase(),
      String(locality?.territoryPrefix || '').toLowerCase(),
    ].filter(Boolean);
  }

  private normalizeTerritoryNumber(value: string): number {
    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : -1;
  }

  /**
   * Retorna cuántos días hace que se COMPLETÓ un territorio.
   * Infinity = nunca completado (prioridad máxima — aparece primero en rojo).
   */
  getTerritoryLastUsedDays(num: string, locationPrefix: string): number {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);

    let foundDays = Infinity;

    if (
      this.territoryLastCompletedDays[locationPrefix] &&
      this.territoryLastCompletedDays[locationPrefix][territoryNumber] !== undefined
    ) {
      foundDays = this.territoryLastCompletedDays[locationPrefix][territoryNumber];
    } else {
      for (const loc of this.localities) {
        if (
          locationNames.includes(loc.territoryPrefix.toLowerCase()) ||
          locationNames.includes(loc.key.toLowerCase())
        ) {
          if (
            this.territoryLastCompletedDays[loc.territoryPrefix] &&
            this.territoryLastCompletedDays[loc.territoryPrefix][territoryNumber] !== undefined
          ) {
            foundDays = this.territoryLastCompletedDays[loc.territoryPrefix][territoryNumber];
            break;
          }
        }
      }
    }

    return foundDays;
  }

  /**
   * Retorna una etiqueta human-friendly de la antigüedad del territorio.
   */
  getTerritoryAgeLabel(num: string, locationPrefix: string): string {
    const days = this.getTerritoryLastUsedDays(num, locationPrefix);
    if (!isFinite(days)) return 'Nunca';
    if (days < 7) return `Hace ${days}d`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  /**
   * Retorna la clase de color de fila según antigüedad del territorio.
   */
  getTerritoryPriorityColor(num: string, locationPrefix: string): string {
    const days = this.getTerritoryLastUsedDays(num, locationPrefix);
    if (!isFinite(days) || days >= 57) return 'danger';
    if (days >= 43) return 'warning';
    if (days >= 29) return 'primary';
    return 'success';
  }

  getPriorityColorClass(num: string, locationPrefix: string): string {
    const color = this.getTerritoryPriorityColor(num, locationPrefix);
    switch (color) {
      case 'danger':
        return 'border-l-[6px] border-l-red-500 border-red-500/30 bg-red-500/10 hover:bg-red-500/20';
      case 'warning':
        return 'border-l-[6px] border-l-amber-500 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20';
      case 'primary':
        return 'border-l-[6px] border-l-sky-500 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20';
      case 'success':
        return 'border-l-[6px] border-l-emerald-500 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20';
      default:
        return 'border-l-[6px] border-l-slate-500 border-slate-700/50 bg-slate-800/80 hover:bg-slate-700/80';
    }
  }
}
