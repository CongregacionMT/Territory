import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  Firestore,
  getDocs,
  query,
  where,
  Timestamp,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { environment } from '@environments/environment';
import { take } from 'rxjs/operators';

export interface LocalityGroup {
  name: string;
  territories: { id: string; nombre: string; porcentaje: number }[];
}

@Component({
  selector: 'app-campaign-page',
  imports: [FormsModule],
  templateUrl: './campaign-page.component.html',
  styleUrl: './campaign-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPageComponent implements OnInit {
  readonly window = window;
  campaignName = signal('');
  campaignDescription = signal('');
  campaignEnd = signal('');
  initialInvitations = signal<number | null>(null);
  campaignInProgress = signal(false);
  nameInvalid = signal(false);
  dateInvalid = signal(false);

  // Progress overlay state
  startingCampaign = signal(false);
  finishingCampaign = signal(false);
  campaignProgress = signal(0);
  campaignProgressTotal = signal(0);
  campaignError = signal<string | null>(null);

  // End Campaign Modal State
  showEndCampaignModal = signal(false);
  showStartConfirmModal = signal(false);
  leftoverInvitations = signal<'muchas' | 'algunas' | 'pocas' | 'ninguna' | 'faltaron' | ''>(
    '',
  );
  missingInvitations = signal<number | null>(null);
  finalComments = signal('');
  finalEndDate = signal('');
  filteredDepartures = signal<
    {
      id: string;
      date: string;
      dateLabel: string;
      driver: string;
      locality?: string;
      point?: string;
      checked: boolean;
      publishers: number | undefined;
    }[]
  >([]);

  activeCampaign: any = null;
  private campaignService = inject(CampaignService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private territoryService = inject(TerritoryDataService);
  private cdr = inject(ChangeDetectorRef);

  territoriosPorLocalidad = signal<LocalityGroup[]>([]);
  campaignHistory = signal<
    { nombre: string; descripcion: string; fecha: string; id: string }[]
  >([]);

  statsGlobal: any = null;

  async ngOnInit() {
    this.spinner.cargarSpinner();
    // Siempre cargar la campaña activa desde Firestore como fuente de verdad
    this.activeCampaign = await this.campaignService.getActiveCampaign();

    if (this.activeCampaign) {
      this.campaignInProgress.set(true);

      // Actualizar la caché local con los datos frescos de Firestore
      localStorage.setItem(
        'activeCampaign',
        JSON.stringify(this.activeCampaign),
      );

      const stats = await this.campaignService.getCampaignStats(
        this.activeCampaign.id,
      );

      this.statsGlobal = stats.global || null;

      this.territoriosPorLocalidad.set(this.groupStatsByLocality(stats));
    }

    const campaigns = await this.campaignService.getInactiveCampaigns();
    this.campaignHistory.set(
      campaigns.map((c) => ({
        id: c.id!,
        nombre: c.name,
        descripcion: c.description,
        fecha: c.dateEnd
          ? new Date((c.dateEnd as any).seconds * 1000).toLocaleDateString()
          : '',
      })),
    );
    this.spinner.cerrarSpinner();
  }

  onNameChange(value: string) {
    this.campaignName.set(value);
    if (value.length > 3) {
      this.nameInvalid.set(false);
    } else {
      this.nameInvalid.set(true);
    }
  }

  onDateChange(value: string) {
    this.campaignEnd.set(value);
    if (!this.campaignEnd()) {
      this.dateInvalid.set(true);
    } else {
      this.dateInvalid.set(false);
    }
  }

  async startCampaign() {
    this.startingCampaign.set(true);
    this.campaignProgress.set(0);
    this.campaignProgressTotal.set(0);

    const campaign = await this.campaignService.startCampaign(
      {
        name: this.campaignName(),
        description: this.campaignDescription(),
        dateEnd: this.campaignEnd(),
        initialInvitations: this.initialInvitations() || 0,
      },
      (current, total) => {
        this.campaignProgress.set(current);
        this.campaignProgressTotal.set(total);
        this.cdr.markForCheck();
      },
    );

    this.activeCampaign = campaign;
    this.campaignInProgress.set(true);
    this.startingCampaign.set(false);

    const stats = await this.campaignService.getCampaignStats(campaign.id);
    this.statsGlobal = stats.global || null;
    this.territoriosPorLocalidad.set(this.groupStatsByLocality(stats));
  }

  async openEndCampaignModal() {
    this.spinner.cargarSpinner();

    // Recargar activeCampaign desde Firestore si es null (robustez ante estado inconsistente)
    if (!this.activeCampaign) {
      this.activeCampaign = await this.campaignService.getActiveCampaign();
    }

    if (!this.activeCampaign) {
      this.spinner.cerrarSpinner();
      alert('No se encontró una campaña activa. Por favor, recargá la página.');
      return;
    }

    if (this.activeCampaign.dateEnd) {
      let d = this.activeCampaign.dateEnd;
      if (d.toDate) d = d.toDate();
      const iso = new Date(d).toISOString().split('T')[0];
      this.finalEndDate.set(iso);
    }

    // Load departures within campaign dates
    // take(1) is critical: without it, every Firestore update re-triggers this
    // subscriber, causing the end-campaign modal and save flow to loop infinitely.
    this.territoryService.getWeeklyDepartures().pipe(take(1)).subscribe((departures) => {
      // Extraer fecha de inicio de forma robusta
      let initTime = 0;
      const dInit = this.activeCampaign.dateInit;
      if (typeof dInit === 'string') {
        // Usar T12:00:00 para asegurar interpretación local y evitar desfasajes por zona horaria
        const dateObj = new Date(dInit.includes('T') ? dInit : dInit + 'T12:00:00');
        initTime = dateObj.getTime();
      } else if (dInit?.toDate) {
        initTime = dInit.toDate().getTime();
      } else if (dInit?.seconds) {
        initTime = dInit.seconds * 1000;
      } else {
        initTime = new Date(dInit).getTime();
      }

      // Calcular fecha fin (límite superior)
      let endTime = Infinity;
      const dEnd = this.activeCampaign.dateEnd;
      if (dEnd) {
        let endDate: Date;
        if (typeof dEnd === 'string') {
          // Importante: Usamos T12:00:00 primero para que el navegador lo tome como hora local.
          // Si usáramos T23:59:59 directamente, algunos navegadores podrían interpretarlo como UTC.
          endDate = new Date(dEnd.includes('T') ? dEnd : dEnd + 'T12:00:00');
        } else if (dEnd?.toDate) {
          endDate = dEnd.toDate();
        } else if (dEnd?.seconds) {
          endDate = new Date(dEnd.seconds * 1000);
        } else {
          endDate = new Date(dEnd);
        }
        // Forzamos al último milisegundo del día en hora LOCAL
        endDate.setHours(23, 59, 59, 999);
        endTime = endDate.getTime();
      }

      // Ajustar initTime al lunes de esa semana para no perder la semana de inicio
      // Usamos mediodía para el cálculo del lunes también para asegurar consistencia
      const startDate = new Date(initTime);
      const day = startDate.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const mondayOfStartWeek = new Date(startDate);
      mondayOfStartWeek.setDate(startDate.getDate() - diffToMonday);
      mondayOfStartWeek.setHours(12, 0, 0, 0); 
      const startCompareTime = mondayOfStartWeek.getTime();

      console.log('--- [DEBUG] Finalizando Campaña ---');
      console.log('Rango Campaña:', {
        inicio: new Date(initTime).toLocaleString(),
        finLimit: endTime === Infinity ? 'Sin límite' : new Date(endTime).toLocaleString(),
        lunesSemanaInicio: mondayOfStartWeek.toLocaleString()
      });
      console.log('Total semanas recuperadas de DB:', departures.length);

      const inRangeWeeks = departures.filter((d) => {
        const dDate = new Date(d.weekId + 'T12:00:00').getTime();
        return dDate >= startCompareTime;
      });

      console.log('Semanas filtradas (>= lunes inicio):', inRangeWeeks.map(w => w.weekId));

      // Aplanamos todas las salidas individuales de cada semana
      const allIndividualDepartures: any[] = [];
      inRangeWeeks.forEach((week) => {
        if (week.departure && Array.isArray(week.departure)) {
          week.departure.forEach((dep, idx) => {
            const depDate = new Date(dep.date + 'T12:00:00').getTime(); // noon precision
            
            const isAfterInit = depDate >= initTime;
            const isBeforeEnd = depDate <= endTime;

            console.log(`Verificando salida ${dep.date}:`, {
              driver: dep.driver,
              point: dep.point,
              isAfterInit,
              isBeforeEnd,
              incluida: isAfterInit && isBeforeEnd
            });

            // Filtrar cada salida individual por el rango exacto de la campaña
            if (isAfterInit && isBeforeEnd) {
              // Resolver nombre amigable de la localidad
              let localityName: string | undefined;
              if (dep.location && environment.localities?.length) {
                const sortedLoc = [...environment.localities].sort(
                  (a, b) => b.territoryPrefix.length - a.territoryPrefix.length,
                );
                const match = sortedLoc.find((loc) =>
                  dep.location.startsWith(loc.territoryPrefix),
                );
                localityName = match?.name;
              }

              // Formatear fecha en español
              const parsedDate = new Date(dep.date + 'T12:00:00'); // noon para evitar desfase de timezone
              const dateLabel = parsedDate.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              });
              
              allIndividualDepartures.push({
                id: `${week.weekId}-${idx}`,
                date: dep.date,
                dateLabel,
                driver: dep.driver || 'Sin conductor',
                locality: localityName || null,
                point: dep.point || 'Sin punto de encuentro',
                checked: false,
              });
            }
          });
        }
      });

      // Ordenar por fecha cronológicamente
      allIndividualDepartures.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      console.log(
        '[CampaignStats] Individual departures in range:',
        allIndividualDepartures,
      );

      this.filteredDepartures.set(allIndividualDepartures);

      this.leftoverInvitations.set('');
      this.showEndCampaignModal.set(true);
      this.spinner.cerrarSpinner();
    });
  }

  cancelEndCampaign() {
    this.showEndCampaignModal.set(false);
  }

  toggleDepartureCheck(index: number) {
    const list = [...this.filteredDepartures()];
    list[index].checked = !list[index].checked;
    console.log(`[DEBUG] Toggled Departure: ${list[index].date} - ${list[index].point}. Checked: ${list[index].checked}`);
    this.filteredDepartures.set(list);
  }

  async confirmEndCampaign() {
    const isConfirmed = window.confirm(
      '¿Estás seguro de que quieres finalizar la campaña? Ya NO podrás hacer más cambios en los territorios ni salidas una vez confirmada esta acción.'
    );
    if (!isConfirmed) return;

    if (!this.leftoverInvitations()) return;

    const active = this.campaignService.getCachedCampaign();
    if (!active) {
      this.showEndCampaignModal.set(false);
      return;
    }

    this.showEndCampaignModal.set(false);
    this.finishingCampaign.set(true);
    this.campaignProgress.set(0);
    this.campaignProgressTotal.set(0);

    // Format departures Info
    const deps = this.filteredDepartures();
    const checkedDeps = deps.filter((d) => d.checked);

    const departuresInfo = {
      checkedCount: checkedDeps.length,
      details: checkedDeps,
    };

    // Capture the campaign ID before clearing state, so we can navigate to
    // the result detail page once saving completes.
    const finishedCampaignId = active.id;

    this.campaignError.set(null);
    try {
      await this.campaignService.endCampaign(
        active.id,
        active.stats,
        this.leftoverInvitations(),
        departuresInfo,
        this.leftoverInvitations() === 'faltaron' ? (this.missingInvitations() ?? null) : null,
        this.finalComments(),
        Timestamp.fromDate(new Date(this.finalEndDate() + 'T23:59:59')),
        (current: number, total: number) => {
          this.campaignProgress.set(current);
          this.campaignProgressTotal.set(total);
          this.cdr.markForCheck();
        },
      );

      this.campaignInProgress.set(false);
      this.activeCampaign = null;
      this.finishingCampaign.set(false);
      this.cdr.markForCheck();

      // Navigate to the finished campaign's detail/result page
      this.router.navigate(['/campaign', finishedCampaignId]);
    } catch (err: any) {
      console.error('[CampaignPage] Error finalizando campaña:', err);
      this.finishingCampaign.set(false);
      this.campaignError.set(
        err?.message ||
          'Ocurrió un error inesperado al finalizar. Recargá la página e intentá de nuevo.',
      );
      this.cdr.markForCheck();
    }
  }

  get daysLeft(): number {
    if (!this.activeCampaign?.dateEnd) return 0;
    const end = this.activeCampaign.dateEnd.toDate
      ? this.activeCampaign.dateEnd.toDate()
      : new Date(this.activeCampaign.dateEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  goToCampaignDetail(campaignId: string) {
    this.router.navigate(['/campaign', campaignId]);
  }

  async confirmStartCampaign() {
    this.showStartConfirmModal.set(false);
    this.nameInvalid.set(false);
    this.dateInvalid.set(false);

    if (!this.campaignName() || this.campaignName().trim().length < 3) {
      this.nameInvalid.set(true);
      return;
    }

    if (!this.campaignEnd()) {
      this.dateInvalid.set(true);
      return;
    }

    await this.startCampaign();
  }

  private formatTerritoryName(key: string): string {
    if (!key) return 'Territorio';
    if (key.startsWith('Territorio ')) return key;

    // Si es un nombre de colección (ej: SanRafael-Territorio-5 o TerritorioMT-5), lo limpiamos
    if (key.includes('Territorio')) {
      const parts = key.split(/[- ]/);
      // El número suele ser la última parte (ej: "5" en "TerritorioMT-5" o "MT-5")
      const lastPart = parts[parts.length - 1];
      const match = lastPart.match(/\d+$/); // Extraer solo el número del final

      if (match) {
        return `Territorio ${match[0]}`;
      }
    }

    return key;
  }

  private groupStatsByLocality(stats: any): LocalityGroup[] {
    console.log('[CampaignStats] raw stats:', stats);
    const groupsMap = new Map<string, LocalityGroup>();

    // Ordenar localidades por longitud de prefijo descendente para evitar falsos positivos
    // Ejemplo: 'TerritorioCAI' debe evaluarse antes que 'TerritorioC'
    const sortedLocalities = [...(environment.localities || [])].sort(
      (a, b) => b.territoryPrefix.length - a.territoryPrefix.length,
    );

    // Inicializar grupos base según environment
    if (sortedLocalities.length > 0) {
      sortedLocalities.forEach((loc) => {
        groupsMap.set(loc.territoryPrefix, { name: loc.name, territories: [] });
      });
    } else {
      groupsMap.set(environment.territoryPrefix, {
        name: environment.congregationName,
        territories: [],
      });
    }

    // Carpeta "Otros" por si hay keys que no hagan match
    groupsMap.set('OTROS', { name: 'Otros Territorios', territories: [] });

    Object.keys(stats).forEach((key) => {
      // Ignorar stats globales o con errores de undefined
      if (key === 'global' || key.includes('undefined')) return;

      let matchedPrefix = 'OTROS';

      // Buscar si el key empieza con algún prefijo conocido
      if (sortedLocalities.length > 0) {
        const match = sortedLocalities.find((loc) =>
          key.startsWith(loc.territoryPrefix),
        );
        if (match) {
          matchedPrefix = match.territoryPrefix;
        }
      } else {
        if (key.startsWith(environment.territoryPrefix)) {
          matchedPrefix = environment.territoryPrefix;
        }
      }

      const rawTerritory = stats[key];
      const group = groupsMap.get(matchedPrefix);
      if (group) {
        group.territories.push({
          id: key,
          nombre: this.formatTerritoryName(key),
          porcentaje: rawTerritory.percent || 0,
        });
      }
    });

    console.log('[CampaignStats] groups map:', Array.from(groupsMap.entries()));

    // Convertir a array, ordenar territorios por número internamente y filtrar grupos vacíos
    return Array.from(groupsMap.values())
      .filter((group) => group.territories.length > 0)
      .map((group) => {
        group.territories.sort((a, b) => {
          const numA = parseInt(a.nombre.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.nombre.replace(/\D/g, ''), 10) || 0;
          return numA - numB;
        });
        return group;
      });
  }
}
