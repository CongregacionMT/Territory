import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { environment } from '@environments/environment';

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
  leftoverInvitations = signal<'muchas' | 'algunas' | 'pocas' | 'ninguna' | ''>(
    '',
  );
  filteredDepartures = signal<
    {
      id: string;
      date: string;
      dateLabel: string;
      driver: string;
      locality?: string;
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
          ? new Date(c.dateEnd.seconds * 1000).toLocaleDateString()
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

    // Load departures within campaign dates
    this.territoryService.getWeeklyDepartures().subscribe((departures) => {
      // Extraer fecha de inicio de forma robusta
      let initTime = 0;
      const dInit = this.activeCampaign.dateInit;

      if (typeof dInit === 'string') {
        initTime = new Date(dInit).getTime();
      } else if (dInit?.toDate) {
        initTime = dInit.toDate().getTime();
      } else if (dInit?.seconds) {
        initTime = dInit.seconds * 1000;
      } else {
        initTime = new Date(dInit).getTime();
      }

      const now = new Date().getTime();

      // Ajustar initTime al lunes de esa semana para no perder la semana de inicio
      const startDate = new Date(initTime);
      const day = startDate.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const mondayOfStartWeek = new Date(startDate);
      mondayOfStartWeek.setDate(startDate.getDate() - diffToMonday);
      mondayOfStartWeek.setHours(0, 0, 0, 0);
      const startCompareTime = mondayOfStartWeek.getTime();

      console.log('[CampaignStats] Filtering departures:', {
        campaignStart: new Date(initTime).toISOString(),
        mondayOfStartWeek: mondayOfStartWeek.toISOString(),
        now: new Date(now).toISOString(),
        totalDepartures: departures.length,
      });

      const inRangeWeeks = departures.filter((d) => {
        const dDate = new Date(d.weekId).getTime();
        return dDate >= startCompareTime;
      });

      // Aplanamos todas las salidas individuales de cada semana
      const allIndividualDepartures: any[] = [];
      inRangeWeeks.forEach((week) => {
        if (week.departure && Array.isArray(week.departure)) {
          week.departure.forEach((dep, idx) => {
            const depDate = new Date(dep.date).getTime();
            // Filtrar cada salida individual por la fecha exacta de inicio de campaña
            if (depDate >= initTime) {
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
              console.log('dep', dep);
              allIndividualDepartures.push({
                id: `${week.weekId}-${idx}`,
                date: dep.date,
                dateLabel,
                driver: dep.driver || 'Sin conductor',
                locality: localityName,
                checked: false,
                publishers: undefined,
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
    this.filteredDepartures.set(list);
  }

  updateDeparturePublishers(index: number, count: any) {
    const list = [...this.filteredDepartures()];
    list[index].publishers = count ? Number(count) : undefined;
    this.filteredDepartures.set(list);
  }

  async confirmEndCampaign() {
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
    const totalPublishers = checkedDeps.reduce(
      (acc, curr) => acc + (curr.publishers || 0),
      0,
    );

    const departuresInfo = {
      checkedCount: checkedDeps.length,
      totalPublishers: totalPublishers,
      details: checkedDeps,
    };

    this.campaignError.set(null);
    try {
      await this.campaignService.endCampaign(
        active.id,
        active.stats,
        this.leftoverInvitations(),
        departuresInfo,
        (current, total) => {
          this.campaignProgress.set(current);
          this.campaignProgressTotal.set(total);
          this.cdr.markForCheck();
        },
      );

      this.campaignInProgress.set(false);
      this.activeCampaign = null;
      this.finishingCampaign.set(false);
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('[CampaignPage] Error finalizando campaña:', err);
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
