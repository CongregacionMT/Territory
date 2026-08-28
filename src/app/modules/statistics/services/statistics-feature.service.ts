import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { Card, CardApplesData } from '@core/models/Card';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { take, firstValueFrom } from 'rxjs';

@Injectable()
export class StatisticsFeatureService {
  private destroyRef = inject(DestroyRef);
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  // State
  readonly loadingData = signal<boolean>(false);
  readonly dataListFull = signal<Card[][]>([]);
  readonly timeRange = signal<number>(6); // months
  readonly summaryStats = signal({
    totalTerritories: 0,
    completedInPeriod: 0,
    totalApples: 0,
    percentCompleted: 0,
  });

  private readonly allPersonalEntries = signal<Card[]>([]);
  private readonly currentLocality = signal<string>('');

  readonly personalTerritories = computed(() => {
    const path = this.currentLocality();
    const entries = this.allPersonalEntries();
    if (!path) return [];

    return entries.filter((e) => {
      const loc = (e.location || '').toLowerCase();
      const p = (path || '').toLowerCase();
      return loc === p || loc.includes(p) || p.includes(loc);
    });
  });

  constructor() {
    this.territorieDataService
      .getCardAssigned()
      .pipe(take(1))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entries) => {
        this.allPersonalEntries.set(entries);
      });
  }

  async setTimeRange(months: number): Promise<void> {
    this.timeRange.set(months);
    await this.loadLocalityData(this.currentLocality(), true);
  }

  async loadLocalityData(locality: string, forceRefresh = false): Promise<void> {
    if (!locality) return;
    this.currentLocality.set(locality);

    const suffix = locality.charAt(0).toUpperCase() + locality.slice(1).replace(/-/g, '');
    const storageKey = `statisticData${suffix}_${this.timeRange()}`;

    if (!forceRefresh && sessionStorage.getItem(storageKey)) {
      const storedStatisticData = sessionStorage.getItem(storageKey);
      this.dataListFull.set(
        storedStatisticData ? (JSON.parse(storedStatisticData) as Card[][]) : [],
      );
      this.calculateSummary();
      this.loadingData.set(true);
      return;
    }

    this.loadingData.set(false);
    this.spinner.cargarSpinner();

    let storedNumberTerritory = sessionStorage.getItem('numberTerritory');

    if (!storedNumberTerritory) {
      await firstValueFrom(this.territorieDataService.getNumberTerritory());
      storedNumberTerritory = sessionStorage.getItem('numberTerritory');
    }

    const numberTerritory = storedNumberTerritory
      ? (JSON.parse(storedNumberTerritory) as Record<string, TerritoryNumberData[]>)
      : {};
    const localityTerritories = numberTerritory[locality] || [];

    if (localityTerritories.length === 0) {
      this.spinner.cerrarSpinner();
      this.loadingData.set(true);
      return;
    }

    const fetchedData: Card[][] = [];
    const promises = localityTerritories.map(
      (t: TerritoryNumberData) =>
        new Promise<void>((resolve) => {
          this.territorieDataService
            .getCardTerritorie(t.collection, 120)
            .pipe(take(1))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((allCards) => {
              const blueprintCard = allCards[0];

              const filterMonths = this.timeRange();
              const fromDateLimit = new Date();
              fromDateLimit.setMonth(fromDateLimit.getMonth() - filterMonths);

              const periodCards = allCards.filter((c) => {
                const creation = c.creation as { toDate?: () => Date; seconds?: number };
                let cardDate: Date;

                if (creation && typeof creation.toDate === 'function') {
                  cardDate = creation.toDate();
                } else if (creation && typeof creation.seconds === 'number') {
                  cardDate = new Date(creation.seconds * 1000);
                } else {
                  cardDate = new Date(creation as unknown as string);
                }

                return !isNaN(cardDate.getTime()) && cardDate >= fromDateLimit;
              });

              const activityCards = periodCards.filter(
                (c) =>
                  (c.applesData || []).some((a: CardApplesData) => a.checked) ||
                  (c.id &&
                    (c.id.startsWith('PostCampaña') || c.id.startsWith('Campaña-undefined'))),
              );

              if (activityCards.length > 0) {
                fetchedData.push(activityCards);
              } else {
                fetchedData.push([
                  {
                    numberTerritory: t.territorio,
                    applesData: blueprintCard?.applesData || [],
                    driver: '',
                    end: '',
                    isPlaceholder: true,
                  },
                ]);
              }
              resolve();
            });
        }),
    );

    await Promise.all(promises);
    this.dataListFull.set(fetchedData);
    this.calculateSummary();
    this.spinner.cerrarSpinner();
    this.loadingData.set(true);
  }

  private calculateSummary(): void {
    const data = this.dataListFull();
    let totalApplesInLocality = 0;
    let completedApplesInPeriod = 0;
    let territoriesCompleted = 0;

    data.forEach((territoryCards) => {
      const primaryCard = territoryCards[0];
      if (!primaryCard) return;

      const applesInTerritory = primaryCard.applesData?.length || 0;
      totalApplesInLocality += applesInTerritory;

      if (!primaryCard.isPlaceholder) {
        let maxCheckedInPeriod = 0;
        let wasFullyCompleted = false;

        territoryCards.forEach((c: Card) => {
          if (c.isPlaceholder) return;
          const apples = c.applesData || [];
          const checkedCount = apples.filter((a: CardApplesData) => a.checked).length;

          if (checkedCount > maxCheckedInPeriod) {
            maxCheckedInPeriod = checkedCount;
          }

          if (apples.length > 0 && checkedCount === apples.length) {
            wasFullyCompleted = true;
          }
        });

        completedApplesInPeriod += maxCheckedInPeriod;
        if (wasFullyCompleted) territoriesCompleted++;
      }
    });

    this.summaryStats.set({
      totalTerritories: data.length,
      completedInPeriod: territoriesCompleted,
      totalApples: completedApplesInPeriod,
      percentCompleted:
        totalApplesInLocality > 0
          ? Math.round((completedApplesInPeriod / totalApplesInLocality) * 1000) / 10
          : 0,
    });
  }
}
