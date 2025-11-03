import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderTerritoriesPipe } from '@core/pipes/order-territories.pipe';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';

@Component({
  selector: 'app-campaign-page',
  imports: [FormsModule, OrderTerritoriesPipe],
  templateUrl: './campaign-page.component.html',
  styleUrl: './campaign-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CampaignPageComponent implements OnInit {
  campaignName = signal('');
  campaignDescription = signal('');
  campaignEnd = signal('');
  campaignInProgress = signal(false);
  nameInvalid = signal(false);
  dateInvalid = signal(false);

  activeCampaign: any = null;
  private campaignService = inject(CampaignService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);

  territorios = signal<{ nombre: string; porcentaje: number }[]>([]);
  campaignHistory = signal<{ nombre: string; descripcion: string; fecha: string; id: string }[]>([]);

  statsGlobal: any = null;

  async ngOnInit() {
    this.spinner.cargarSpinner();
    const active = this.campaignService.getCachedCampaign();
    this.activeCampaign = await this.campaignService.getActiveCampaign();

    if (active) {
      this.campaignInProgress.set(true);

      const stats = await this.campaignService.getCampaignStats(active.id);

      this.statsGlobal = stats.global || null;

      this.territorios.set(
        Object.keys(stats)
          .filter(k => k.startsWith('Territorio '))
          .map(k => ({
            nombre: k,
            porcentaje: stats[k].percent
          }))
      );
    }


    const campaigns = await this.campaignService.getInactiveCampaigns();
    this.campaignHistory.set(
      campaigns.map(c => ({
        id: c.id,
        nombre: c.name,
        descripcion: c.description,
        fecha: c.dateEnd
          ? new Date(c.dateEnd.seconds * 1000).toLocaleDateString()
          : ''
      }))
    );
    this.spinner.cerrarSpinner();
  }

  onNameChange(value: string) {
    this.campaignName.set(value);
    if(value.length > 3){
      this.nameInvalid.set(false);
    } else {
      this.nameInvalid.set(true);
    }
  }

  onDateChange(value: string) {
    this.campaignEnd.set(value);
    if(!this.campaignEnd()){
      this.dateInvalid.set(true);
    } else {
      this.dateInvalid.set(false);
    }
  }

  async startCampaign() {
    this.spinner.cargarSpinner();
    const campaign = await this.campaignService.startCampaign({
      name: this.campaignName(),
      description: this.campaignDescription(),
      dateEnd: this.campaignEnd(),
    });

    this.activeCampaign = campaign;
    this.campaignInProgress.set(true);

    const stats = await this.campaignService.getCampaignStats(campaign.id);
    this.statsGlobal = stats.global || null;
    this.territorios.set(
      Object.keys(stats)
        .filter(k => k.startsWith('Territorio '))
        .map(k => ({
          nombre: k,
          porcentaje: stats[k].percent
        }))
    );

    this.spinner.cerrarSpinner();
  }

  async endCampaign() {
    this.spinner.cargarSpinner();
    const active = this.campaignService.getCachedCampaign();
    if (active) {
      await this.campaignService.endCampaign(active.id, active.stats);
    }
    this.campaignInProgress.set(false);
    this.activeCampaign = null;
    this.spinner.cerrarSpinner();
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
    // Validaciones antes de crear
    if (!this.campaignName() || this.campaignName().trim().length < 3) {
      this.nameInvalid.set(true);
      return; // no cierres el modal
    }

    if (!this.campaignEnd()) {
      this.dateInvalid.set(true);
      return; // no cierres el modal
    }

    this.spinner.cargarSpinner();
    const campaign = await this.campaignService.startCampaign({
      name: this.campaignName(),
      description: this.campaignDescription(),
      dateEnd: this.campaignEnd(),
    });

    this.activeCampaign = campaign;
    this.campaignInProgress.set(true);

    const stats = await this.campaignService.getCampaignStats(campaign.id);
    this.statsGlobal = stats.global || null;
    this.territorios.set(
      Object.keys(stats)
        .filter(k => k.startsWith('Territorio '))
        .map(k => ({
          nombre: k,
          porcentaje: stats[k].percent
        }))
    );

    this.spinner.cerrarSpinner();
  }

}

