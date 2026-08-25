import { DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerritorioStats } from '@core/models/TerritorioStats';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import {
  CampaignLocalityGroup,
  groupStatsByLocality,
  parseFirebaseDate,
} from '@shared/utils/campaign.utils';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { ProgressBarComponent } from '@shared/components/progress-bar/progress-bar.component';

export type FirebaseDate = string | number | Date | { toDate?: () => Date; seconds?: number };

export interface CampaignData {
  id?: string;
  name?: string;
  description?: string;
  dateInit?: FirebaseDate;
  dateEnd?: FirebaseDate;
  active?: boolean;
  initialInvitations?: number;
  leftoverInvitations?: string;
  missingInvitations?: number;
  finalComments?: string;
  departuresInfo?: { checkedCount: number };
  stats?: Record<string, { percent: number; total: number; salidas?: number; done: number }>;
}

@Component({
  selector: 'app-campaign-detail',
  imports: [DatePipe, NgClass, KpiCardComponent, ProgressBarComponent],
  templateUrl: './campaign-detail.component.html',
  styleUrl: './campaign-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignDetailComponent implements OnInit {
  campaign = signal<CampaignData>({});
  territorios = signal<TerritorioStats[]>([]);
  private spinner = inject(SpinnerService);
  private route = inject(ActivatedRoute);
  private campaignService = inject(CampaignService);

  // Fechas parseadas para la vista
  parsedDateInit = computed(() => parseFirebaseDate(this.campaign().dateInit));
  parsedDateEnd = computed(() => parseFirebaseDate(this.campaign().dateEnd));

  territoriosCompletados = 0;
  salidasTotales = 0;
  manzanasCompletadas = 0;
  manzanasTotales = 0;
  territorioPercent = 0;
  totalTerritorios = 0;

  // Novedades
  initialInvitations = 0;
  leftoverInvitations = '';
  missingInvitations: number | null = null;
  departuresCount = 0;
  finalComments = '';

  territoriosPorLocalidad = signal<CampaignLocalityGroup[]>([]);

  ngOnInit(): void {
    void this.loadData();
  }

  async loadData(): Promise<void> {
    this.spinner.cargarSpinner();

    try {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) return;
      const data = (await this.campaignService.getCampaignById(id)) as CampaignData | null;
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
          const localityGroups = groupStatsByLocality(data.stats);
          this.territoriosPorLocalidad.set(localityGroups);

          // Calcular totales globales iterando sobre los grupos limpios
          this.manzanasCompletadas = 0;
          this.manzanasTotales = 0;
          this.territoriosCompletados = 0;
          this.totalTerritorios = 0;
          this.salidasTotales = 0;

          const allTerritories: TerritorioStats[] = [];

          for (const group of localityGroups) {
            this.manzanasCompletadas += group.applesDone;
            this.manzanasTotales += group.applesTotal;
            this.territoriosCompletados += group.completed;
            this.totalTerritorios += group.total;

            for (const t of group.territories) {
              this.salidasTotales += t.salidas || 0;
              allTerritories.push(t);
            }
          }

          this.territorios.set(allTerritories);

          this.territorioPercent =
            this.manzanasTotales > 0
              ? Math.round((this.manzanasCompletadas / this.manzanasTotales) * 100)
              : 0;
        }
      }
    } finally {
      this.spinner.cerrarSpinner();
    }
  }
}
