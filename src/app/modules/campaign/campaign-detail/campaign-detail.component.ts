import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerritorioStats } from '@core/models/TerritorioStats';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import { environment } from '@environments/environment';

export interface LocalityGroup {
  name: string;
  territories: TerritorioStats[];
  completed: number;
  total: number;
  percent: number;
  applesDone: number;
  applesTotal: number;
}

export interface CampaignData {
  id?: string;
  name?: string;
  description?: string;
  dateInit?: any;
  dateEnd?: any;
  active?: boolean;
  initialInvitations?: number;
  leftoverInvitations?: string;
  missingInvitations?: number;
  finalComments?: string;
  departuresInfo?: { checkedCount: number };
  stats?: any;
}

@Component({
  selector: 'app-campaign-detail',
  imports: [DatePipe, NgClass],
  templateUrl: './campaign-detail.component.html',
  styleUrl: './campaign-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignDetailComponent implements OnInit {
  campaign = signal<CampaignData>({} as CampaignData);
  territorios = signal<TerritorioStats[]>([]);
  private spinner = inject(SpinnerService);

  territoriosCompletados = 0;
  salidasTotales = 0;
  manzanasCompletadas = 0;
  manzanasTotales = 0;
  territorioPercent = 0;

  // Novedades
  initialInvitations = 0;
  leftoverInvitations = '';
  missingInvitations: number | null = null;
  departuresCount = 0;
  finalComments = '';

  territoriosPorLocalidad = signal<LocalityGroup[]>([]);

  constructor(
    private route: ActivatedRoute,
    private campaignService: CampaignService,
  ) {}

  async ngOnInit() {
    this.spinner.cargarSpinner();

    try {
      const id = this.route.snapshot.paramMap.get('id')!;
      const data = await this.campaignService.getCampaignById(id) as CampaignData | null;
      if (data) {
        this.campaign.set(data);
        this.initialInvitations = data.initialInvitations || 0;
        this.leftoverInvitations = data.leftoverInvitations || '';
        this.missingInvitations = data.missingInvitations || null;
        this.finalComments = data.finalComments || '';

        if (data.departuresInfo) {
          this.departuresCount = data.departuresInfo.checkedCount || 0;
        }

        if (data.stats) {
          const stats = data.stats as Record<string, { percent: number; total: number; salidas: number; done: number; }>;
          const gruposMap = new Map<string, LocalityGroup>();

          const sortedLocalities = [...(environment.localities || [])].sort(
            (a, b) => b.territoryPrefix.length - a.territoryPrefix.length,
          );

          if (sortedLocalities.length > 0) {
            sortedLocalities.forEach((loc) => {
              gruposMap.set(loc.territoryPrefix, {
                name: loc.name,
                territories: [],
                completed: 0,
                total: 0,
                percent: 0,
                applesDone: 0,
                applesTotal: 0,
              });
            });
          } else {
            gruposMap.set(environment.territoryPrefix, {
              name: environment.congregationName,
              territories: [],
              completed: 0,
              total: 0,
              percent: 0,
              applesDone: 0,
              applesTotal: 0,
            });
          }
          gruposMap.set('OTROS', {
            name: 'Otros Territorios',
            territories: [],
            completed: 0,
            total: 0,
            percent: 0,
            applesDone: 0,
            applesTotal: 0,
          });

          const territoriosMapped = Object.keys(stats)
            .filter((k) => k !== 'global' && !k.includes('undefined'))
            .map((k) => {
              let tNombre = k;
              if (k.includes('Territorio')) {
                const parts = k.split(/[- ]/);
                const match = parts[parts.length - 1].match(/\d+$/);
                if (match) tNombre = `Territorio ${match[0]}`;
              }

              const t = {
                id: k,
                nombre: tNombre,
                porcentaje: stats[k].percent || 0,
                total: stats[k].total || 0,
                salidas: stats[k].salidas || 0,
              } as TerritorioStats;

              // Asignar al grupo correcto
              let matchedPrefix = 'OTROS';
              if (sortedLocalities.length > 0) {
                const match = sortedLocalities.find((loc) => k.startsWith(loc.territoryPrefix));
                if (match) matchedPrefix = match.territoryPrefix;
              } else {
                if (k.startsWith(environment.territoryPrefix))
                  matchedPrefix = environment.territoryPrefix;
              }

              const group = gruposMap.get(matchedPrefix);
              if (group) {
                group.territories.push(t);
                group.applesDone += stats[k].done || 0;
                group.applesTotal += stats[k].total || 0;
              }

              return t;
            })
            .sort((a, b) => {
              const numA = parseInt(a.nombre.replace(/\D/g, ''), 10) || 0;
              const numB = parseInt(b.nombre.replace(/\D/g, ''), 10) || 0;
              return numA - numB;
            });

          // Calcular totales por grupo
          this.manzanasCompletadas = 0;
          this.manzanasTotales = 0;

          const localityGroups = Array.from(gruposMap.values())
            .filter((group) => group.territories.length > 0)
            .map((group) => {
              group.territories.sort((a: TerritorioStats, b: TerritorioStats) => {
                const numA = parseInt(a.nombre.replace(/\D/g, ''), 10) || 0;
                const numB = parseInt(b.nombre.replace(/\D/g, ''), 10) || 0;
                return numA - numB;
              });
              group.completed = group.territories.filter((t: TerritorioStats) => t.porcentaje === 100).length;
              group.total = group.territories.length;
              group.percent =
                group.applesTotal > 0
                  ? Math.round((group.applesDone / group.applesTotal) * 100)
                  : 0;

              this.manzanasCompletadas += group.applesDone;
              this.manzanasTotales += group.applesTotal;

              return group;
            });

          this.territoriosPorLocalidad.set(localityGroups);
          this.territorios.set(territoriosMapped);

          // métricas globales
          this.territoriosCompletados = territoriosMapped.filter(
            (t) => t.porcentaje === 100,
          ).length;
          this.territorioPercent =
            this.manzanasTotales > 0
              ? Math.round((this.manzanasCompletadas / this.manzanasTotales) * 100)
              : 0;
          this.salidasTotales = territoriosMapped.reduce((acc, t) => acc + t.salidas, 0);
        }
      }
    } finally {
      this.spinner.cerrarSpinner();
    }
  }
}
