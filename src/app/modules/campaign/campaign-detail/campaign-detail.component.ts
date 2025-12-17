import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerritorioStats } from '@core/models/TerritorioStats';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';

@Component({
  selector: 'app-campaign-detail',
  imports: [DatePipe],
  templateUrl: './campaign-detail.component.html',
  styleUrl: './campaign-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CampaignDetailComponent implements OnInit{
  campaign = signal<any | null>(null);
  territorios = signal<TerritorioStats[]>([]);
  private spinner = inject(SpinnerService);

  territoriosCompletados = 0;
  salidasTotales = 0;

  constructor(private route: ActivatedRoute, private campaignService: CampaignService) {}

  async ngOnInit() {
    this.spinner.cargarSpinner();

    try {
      const id = this.route.snapshot.paramMap.get('id')!;
      const data = await this.campaignService.getCampaignById(id);
      this.campaign.set(data);

      if (data?.stats) {
        const territoriosMapped = Object.keys(data.stats)
          .filter(k => k.startsWith('Territorio '))
          .map(k => ({
            nombre: k,
            porcentaje: data.stats[k].percent || 0,
            total: data.stats[k].total || 0,
            salidas: data.stats[k].salidas || 0
          }))
          .sort((a, b) => {
            const numA = parseInt(a.nombre.replace('Territorio ', ''), 10);
            const numB = parseInt(b.nombre.replace('Territorio ', ''), 10);
            return numA - numB;
          });

        this.territorios.set(territoriosMapped);

        // métricas globales
        this.territoriosCompletados = territoriosMapped.filter(t => t.porcentaje === 100).length;
        this.salidasTotales = territoriosMapped.reduce((acc, t) => acc + t.salidas, 0);
      }
    } finally {
      this.spinner.cerrarSpinner();
    }
  }

}
