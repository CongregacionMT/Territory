import {
  Component,
  OnInit,
  inject,
  computed,
  ChangeDetectionStrategy,
  effect,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, TitleCasePipe, DatePipe } from '@angular/common';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { AuthService } from '@core/services/auth.service';
import { SpinnerService } from '@core/services/spinner.service';
import { Departure } from '@core/models/Departures';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '@environments/environment';

interface DriverCard {
  weekId: string;
  departure: Departure;
  status: 'pending' | 'delayed' | 'received' | 'canceled';
  daysDelayed: number;
}

function getCardStatusInfo(
  dep: Departure,
  today: Date,
): { status: DriverCard['status']; daysDelayed: number; skip: boolean } {
  let daysDelayed = 0;
  if (dep.date) {
    const depDate = new Date(dep.date + 'T00:00:00');
    daysDelayed = Math.floor((today.getTime() - depDate.getTime()) / (1000 * 3600 * 24));
    if (daysDelayed > 15) return { status: 'pending', daysDelayed: 0, skip: true };
  }

  let status: DriverCard['status'] = 'pending';
  if (dep.cardStatus === 'received') {
    status = 'received';
  } else if (dep.cardStatus === 'canceled') {
    status = 'canceled';
  } else if (daysDelayed > 0) {
    status = 'delayed';
  }

  return { status, daysDelayed: daysDelayed > 0 ? daysDelayed : 0, skip: false };
}

@Component({
  selector: 'app-driver-dashboard-page',
  templateUrl: './driver-dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgClass, TitleCasePipe, DatePipe],
})
export class DriverDashboardPageComponent implements OnInit {
  private readonly territoryDataService = inject(TerritoryDataService);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(SpinnerService);

  readonly driverName = this.authService.driverName;
  readonly isAdmin = this.authService.isAdmin;
  activeTab = signal<'mis-tarjetas' | 'control'>('mis-tarjetas');

  // Data
  private readonly weeklyDepartures = toSignal(this.territoryDataService.getWeeklyDepartures(15), {
    initialValue: [],
  });

  readonly myCards = computed<DriverCard[]>(() => {
    const deps = this.weeklyDepartures() || [];
    const name = this.driverName()?.toLowerCase().trim();
    if (!name) return [];

    const cards: DriverCard[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const weekly of deps) {
      if (!weekly.departure) continue;

      for (const dep of weekly.departure) {
        // Ignorar eventos o salidas de otros conductores
        if (dep.isEvent || !dep.driver) continue;
        if (dep.driver.toLowerCase().trim() !== name) continue;

        const info = getCardStatusInfo(dep, today);
        if (info.skip) continue;

        cards.push({
          weekId: weekly.weekId,
          departure: dep,
          status: info.status,
          daysDelayed: info.daysDelayed,
        });
      }
    }

    // Ordenar: primero las retrasadas, luego pendientes, luego canceladas/recibidas
    return cards.sort((a, b) => {
      const statusWeight = { delayed: 0, pending: 1, received: 2, canceled: 3 };
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[a.status] - statusWeight[b.status];
      }
      // Luego por fecha (las más antiguas primero para retrasadas, más nuevas para el resto)
      const dateA = new Date(a.departure.date || '').getTime();
      const dateB = new Date(b.departure.date || '').getTime();
      return a.status === 'delayed' ? dateA - dateB : dateB - dateA;
    });
  });

  readonly pendingCards = computed(() =>
    this.myCards().filter((c) => c.status === 'pending' || c.status === 'delayed'),
  );
  readonly historyCards = computed(() =>
    this.myCards().filter((c) => c.status === 'received' || c.status === 'canceled'),
  );

  readonly allDriversControlCards = computed(() => {
    if (!this.isAdmin()) return [];

    const deps = this.weeklyDepartures() || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const driversMap = new Map<
      string,
      { pending: number; delayed: number; cards: DriverCard[]; originalName: string }
    >();

    const allDepartures = deps.flatMap((w) =>
      (w.departure || []).map((dep) => ({ dep, weekId: w.weekId })),
    );

    for (const { dep, weekId } of allDepartures) {
      if (dep.isEvent || !dep.driver) continue;
      const driverNameOriginal = dep.driver;
      const driverKey = driverNameOriginal.toLowerCase().trim();

      const info = getCardStatusInfo(dep, today);
      if (info.skip || (info.status !== 'pending' && info.status !== 'delayed')) continue;

      const card: DriverCard = {
        weekId,
        departure: dep,
        status: info.status,
        daysDelayed: info.daysDelayed,
      };

      let driverData = driversMap.get(driverKey);
      if (!driverData) {
        driverData = { pending: 0, delayed: 0, cards: [], originalName: driverNameOriginal };
        driversMap.set(driverKey, driverData);
      }
      driverData.cards.push(card);
      if (info.status === 'pending') driverData.pending++;
      if (info.status === 'delayed') driverData.delayed++;
    }

    return Array.from(driversMap.values())
      .map((data) => ({
        driverName: data.originalName,
        pending: data.pending,
        delayed: data.delayed,
        cards: [...data.cards].sort((a, b) => {
          if (a.status === 'delayed' && b.status !== 'delayed') return -1;
          if (a.status !== 'delayed' && b.status === 'delayed') return 1;
          const dateA = a.departure.date ? new Date(a.departure.date).getTime() : 0;
          const dateB = b.departure.date ? new Date(b.departure.date).getTime() : 0;
          return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
        }),
      }))
      .sort((a, b) => b.delayed - a.delayed || b.pending - a.pending);
  });

  constructor() {
    effect(() => {
      if (this.weeklyDepartures().length > 0) {
        this.spinner.cerrarSpinner();
      }
    });
  }

  ngOnInit(): void {
    if (this.weeklyDepartures().length === 0) {
      this.spinner.cargarSpinner();
    }
  }

  getDayOfWeek(dateString: string): string {
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const date = new Date(dateString + 'T00:00:00');
    return daysOfWeek[date.getDay()];
  }

  async markAsCanceled(card: DriverCard): Promise<void> {
    if (
      !confirm(
        `¿Estás seguro de que querés marcar la salida del ${this.getDayOfWeek(card.departure.date || '')} como no realizada/cancelada?`,
      )
    ) {
      return;
    }

    this.spinner.cargarSpinner();
    try {
      // Find the weekly departure doc to update
      const weekId = card.weekId;
      const departureId = card.departure.departureId;

      if (!departureId) {
        console.error('No departureId found');
        return;
      }

      await this.territoryDataService.markDepartureAsCanceled(weekId, departureId);
    } catch (err) {
      console.error(err);
    } finally {
      this.spinner.cerrarSpinner();
    }
  }

  async markAsReceived(card: DriverCard): Promise<void> {
    if (
      !confirm(
        `¿Estás seguro de que querés marcar la salida del ${this.getDayOfWeek(card.departure.date || '')} como recibida?`,
      )
    ) {
      return;
    }

    this.spinner.cargarSpinner();
    try {
      const weekId = card.weekId;
      const departureId = card.departure.departureId;

      if (!departureId) {
        console.error('No departureId found');
        return;
      }

      await this.territoryDataService.markDepartureAsReceived(weekId, departureId);
    } catch (err) {
      console.error(err);
    } finally {
      this.spinner.cerrarSpinner();
    }
  }

  getNormalizedLocation(location: string): string {
    const locality = environment.localities.find((l) => l.key === location);
    return locality ? locality.territoryPrefix : location;
  }

  getTerritoryRoute(location: string, territory: string): string {
    return (
      '/territorios/' + this.getNormalizedLocation(location) + '-' + territory.replace(/\D/g, '')
    );
  }
}
