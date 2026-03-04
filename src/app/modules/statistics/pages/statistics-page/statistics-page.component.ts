import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { take } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SortBy } from '@core/pipes/sort-by.pipe';
import { environment } from '@environments/environment';
import { Card } from '@core/models/Card';

@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.component.html',
  styleUrls: ['./statistics-page.component.scss'],
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, SortBy],
})
export class StatisticsPageComponent implements OnInit {
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);

  // Variables convertidas a signals
  routerBreadcrum = signal<any>([]);
  loadingData = signal<boolean>(false);
  territoryPath = signal<any>(null);
  territory = signal<TerritoryNumberData[]>([]);
  dataListFull = signal<any[]>([]);
  dataStadistics = signal<any[]>([]);
  appleCount = signal<any>(null);
  path = signal<string>('end'); // Default sort by end date
  order = signal<number>(1);
  nameTitleTerritory = signal<string>('');

  // New signals for filtering and summary
  timeRange = signal<number>(1); // months
  summaryStats = signal({
    totalTerritories: 0,
    completedInPeriod: 0,
    totalApples: 0,
    percentCompleted: 0,
  });

  // Datos crudos de Firestore (las tarjetas de territorios personales)
  allPersonalEntries = signal<Card[]>([]);

  // Señal computada para filtrar automáticamente las tarjetas personales por localidad actual
  personalTerritories = computed(() => {
    const path = this.territoryPath();
    const entries = this.allPersonalEntries();
    if (!path) return [];

    return entries.filter((e) => {
      const loc = (e.location || '').toLowerCase();
      const p = (path || '').toLowerCase();
      // Un match más robusto que cubra tanto el nombre (Wheelwright) como la clave (wheelwright)
      return loc === p || loc.includes(p) || p.includes(loc);
    });
  });

  // FormControls no necesitan ser signals ya que tienen su propia reactividad
  green: FormControl;
  blue: FormControl;
  yellow: FormControl;
  red: FormControl;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    // Obtener el parámetro de la URL (ej: 'mariaTeresa', 'christophersen', 'rural')
    this.territoryPath.set(
      this.rutaActiva.snapshot.paramMap.get('locality') || '',
    );

    // Buscar el nombre bonito en la configuración si existe
    const localityConfig = environment.localities?.find(
      (l) => l.key === this.territoryPath(),
    );
    const title = localityConfig
      ? localityConfig.name
      : this.capitalize(this.territoryPath());

    this.nameTitleTerritory.set(title);

    this.green = new FormControl(28);
    this.blue = new FormControl(42);
    this.yellow = new FormControl(56);
    this.red = new FormControl(57);
  }

  ngOnInit(): void {
    // Suscribirse a cambios en los parámetros por si se navega entre localidades
    this.rutaActiva.paramMap.subscribe((params) => {
      const locality = params.get('locality');
      if (locality && locality !== this.territoryPath()) {
        this.territoryPath.set(locality);
        const localityConfig = environment.localities?.find(
          (l) => l.key === locality,
        );
        this.nameTitleTerritory.set(
          localityConfig ? localityConfig.name : this.capitalize(locality),
        );
        this.getDataStatisticTerritory();
      }
    });

    // Initial data load for the locality set in the constructor
    this.getDataStatisticTerritory();

    // Usar getCardAssigned (colección 'Assigned') como fuente única de verdad
    this.territorieDataService
      .getCardAssigned()
      .pipe(take(1)) // Solo necesitamos este stream una vez para las stats, o dejarlo abierto para tiempo real?
      // El usuario recargará usualmente, pero mejor dejarlo abierto para tiempo real si no causa problemas.
      // Sin embargo, para evitar duplicados si hay un error en el pipe, take(1) es seguro.
      .subscribe((entries) => {
        this.allPersonalEntries.set(entries);
      });
  }

  async setTimeRange(months: number) {
    this.timeRange.set(months);
    await this.getDataStatisticTerritory(true);
  }

  async refreshData() {
    await this.getDataStatisticTerritory(true);
  }

  async getDataStatisticTerritory(forceRefresh = false) {
    const path = this.territoryPath();
    if (!path) return;

    const suffix =
      path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, '');
    const storageKey = `statisticData${suffix}_${this.timeRange()}`;

    if (!forceRefresh && sessionStorage.getItem(storageKey)) {
      const storedStatisticData = sessionStorage.getItem(storageKey);
      this.dataListFull.set(
        storedStatisticData ? JSON.parse(storedStatisticData) : [],
      );
      this.calculateSummary();
      this.loadingData.set(true);
      return;
    }

    // If not in storage or force refresh, fetch from service
    this.loadingData.set(false);
    this.spinner.cargarSpinner();

    // Need to get territories for this locality first
    const storedNumberTerritory = sessionStorage.getItem('numberTerritory');
    const numberTerritory = storedNumberTerritory
      ? JSON.parse(storedNumberTerritory)
      : {};
    const localityTerritories = numberTerritory[path] || [];

    if (localityTerritories.length === 0) {
      this.spinner.cerrarSpinner();
      this.loadingData.set(true);
      return;
    }

    const fetchedData: any[] = [];
    const promises = localityTerritories.map(
      (t: any) =>
        new Promise<void>((resolve) => {
          // Obtenemos el histórico para tener la estructura del territorio (blueprint)
          this.territorieDataService
            .getCardTerritorie(t.collection, 120)
            .pipe(take(1)) // EVITAR DUPLICADOS SI EL STREAM EMITE MÁS DE UNA VEZ
            .subscribe((allCards) => {
              const blueprintCard = allCards[0];

              // Filtramos localmente por el rango de tiempo seleccionado
              const filterMonths = this.timeRange();
              const fromDateLimit = new Date();
              fromDateLimit.setMonth(fromDateLimit.getMonth() - filterMonths);

              const periodCards = allCards.filter((c) => {
                const creation = c.creation;
                const cardDate =
                  creation && (creation as any).toDate
                    ? (creation as any).toDate()
                    : new Date(creation);
                return cardDate >= fromDateLimit;
              });

              // Consideramos actividad si hay manzanas marcadas en el periodo
              const activityCards = periodCards.filter((c) =>
                (c.applesData || []).some((a: any) => a.checked),
              );

              if (activityCards.length > 0) {
                fetchedData.push(activityCards);
              } else {
                // Placeholder con estructura blueprint pero sin actividad en periodo
                fetchedData.push([
                  {
                    numberTerritory: t.territorio,
                    applesData: blueprintCard?.applesData || [],
                    driver: 'Sin asignar',
                    end: null,
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
    sessionStorage.setItem(storageKey, JSON.stringify(fetchedData));
    this.calculateSummary();
    this.spinner.cerrarSpinner();
    this.loadingData.set(true);
  }

  calculateSummary() {
    const data = this.dataListFull();
    let totalApplesInLocality = 0;
    let completedApplesInPeriod = 0;
    let territoriesCompleted = 0;

    data.forEach((territoryCards) => {
      const primaryCard = territoryCards[0];
      if (!primaryCard) return;

      // El blueprint nos dice cuántas manzanas TIENE el territorio
      const applesInTerritory = primaryCard.applesData?.length || 0;
      totalApplesInLocality += applesInTerritory;

      // Si no es placeholder, hubo actividad en el periodo
      if (!primaryCard.isPlaceholder) {
        // Sumamos las manzanas completadas en el card más reciente del periodo
        const checkedCount = (primaryCard.applesData || []).filter(
          (a: any) => a.checked,
        ).length;
        completedApplesInPeriod += checkedCount;

        // Un territorio está completado si algún card del periodo tiene TODAS sus manzanas marcadas
        const wasFullyCompleted = territoryCards.some((c: any) => {
          const apples = c.applesData || [];
          return apples.length > 0 && apples.every((a: any) => a.checked);
        });
        if (wasFullyCompleted) territoriesCompleted++;
      }
    });

    this.summaryStats.set({
      totalTerritories: data.length,
      completedInPeriod: territoriesCompleted,
      totalApples: completedApplesInPeriod,
      percentCompleted:
        totalApplesInLocality > 0
          ? Math.round(
              (completedApplesInPeriod / totalApplesInLocality) * 1000,
            ) / 10
          : 0,
    });
  }

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  paintRow(dataList: any) {
    const today = new Date();
    const dateToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const lastEnd =
      dataList[0]?.end ||
      dataList[1]?.end ||
      dataList[2]?.end ||
      dataList[3]?.end ||
      dataList[4]?.end ||
      dataList[5]?.end;

    if (!lastEnd) return 'danger';

    const dateCard = new Date(lastEnd);
    const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));

    if (days < this.green.value) return 'success';
    if (days < this.blue.value) return 'primary';
    if (days < this.yellow.value) return 'warning';
    return 'danger';
  }

  sortTable(prop: string) {
    if (this.path() === prop) {
      this.order.set(this.order() * -1);
    } else {
      this.path.set(prop);
      this.order.set(1);
    }
    return false;
  }

  getIcon(prop: string): string {
    if (this.path() !== prop) return 'fa fa-sort opacity-50';
    return this.order() === -1
      ? 'fa fa-sort-down text-primary'
      : 'fa fa-sort-up text-primary';
  }

  /** Retorna true si el número de territorio está actualmente asignado como personal */
  isPersonalTerritory(number: any): boolean {
    const searchNum = parseInt(String(number), 10);
    return this.personalTerritories().some(
      (e: Card) => parseInt(String(e.territory), 10) === searchNum,
    );
  }

  /** Obtiene la entrada personal para un territorio dado (para mostrar el publicador) */
  getPersonalEntry(number: any): Card | undefined {
    const searchNum = parseInt(String(number), 10);
    return this.personalTerritories().find(
      (e: Card) => parseInt(String(e.territory), 10) === searchNum,
    );
  }
}
