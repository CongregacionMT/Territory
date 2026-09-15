import {
  Component,
  OnInit,
  inject,
  computed,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, TitleCasePipe } from '@angular/common';
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

@Component({
  selector: 'app-driver-dashboard-page',
  templateUrl: './driver-dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgClass, TitleCasePipe],
})
export class DriverDashboardPageComponent implements OnInit {
  private territoryDataService = inject(TerritoryDataService);
  private authService = inject(AuthService);
  private spinner = inject(SpinnerService);

  readonly driverName = this.authService.driverName;

  // Data
  private weeklyDepartures = toSignal(this.territoryDataService.getWeeklyDepartures(), {
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

        // Determinar estado actual
        let currentStatus: DriverCard['status'] = 'pending';
        let daysDelayed = 0;

        if (dep.cardStatus === 'received') {
          currentStatus = 'received';
        } else if (dep.cardStatus === 'canceled') {
          currentStatus = 'canceled';
        } else {
          // Si no fue recibida ni cancelada, ver si está retrasada
          if (dep.date) {
            const depDate = new Date(dep.date + 'T00:00:00');
            const diffTime = today.getTime() - depDate.getTime();
            daysDelayed = Math.floor(diffTime / (1000 * 3600 * 24));

            if (daysDelayed > 0) {
              currentStatus = 'delayed';
            } else {
              currentStatus = 'pending';
            }
          }
        }

        cards.push({
          weekId: weekly.weekId,
          departure: dep,
          status: currentStatus,
          daysDelayed: daysDelayed > 0 ? daysDelayed : 0,
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
