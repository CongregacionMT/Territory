import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderTerritoriesPipe } from '@core/pipes/order-territories.pipe';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { WeeklyDeparture } from '@core/models/Departures';

@Component({
  selector: 'app-campaign-page',
  imports: [FormsModule, OrderTerritoriesPipe],
  templateUrl: './campaign-page.component.html',
  styleUrl: './campaign-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPageComponent implements OnInit {
  campaignName = signal('');
  campaignDescription = signal('');
  campaignEnd = signal('');
  initialInvitations = signal<number | null>(null);
  campaignInProgress = signal(false);
  nameInvalid = signal(false);
  dateInvalid = signal(false);

  // End Campaign Modal State
  showEndCampaignModal = signal(false);
  leftoverInvitations = signal<'muchas' | 'algunas' | 'pocas' | 'ninguna' | ''>(
    '',
  );
  filteredDepartures = signal<
    {
      id: string;
      date: string;
      checked: boolean;
      publishers: number | undefined;
    }[]
  >([]);

  activeCampaign: any = null;
  private campaignService = inject(CampaignService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private territoryService = inject(TerritoryDataService);

  territorios = signal<{ nombre: string; porcentaje: number }[]>([]);
  campaignHistory = signal<
    { nombre: string; descripcion: string; fecha: string; id: string }[]
  >([]);

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
          .filter((k) => k.startsWith('Territorio '))
          .map((k) => ({
            nombre: k,
            porcentaje: stats[k].percent,
          })),
      );
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
    this.spinner.cargarSpinner();
    const campaign = await this.campaignService.startCampaign({
      name: this.campaignName(),
      description: this.campaignDescription(),
      dateEnd: this.campaignEnd(),
      initialInvitations: this.initialInvitations() || 0,
    });

    this.activeCampaign = campaign;
    this.campaignInProgress.set(true);

    const stats = await this.campaignService.getCampaignStats(campaign.id);
    this.statsGlobal = stats.global || null;
    this.territorios.set(
      Object.keys(stats)
        .filter((k) => k.startsWith('Territorio '))
        .map((k) => ({
          nombre: k,
          porcentaje: stats[k].percent,
        })),
    );

    this.spinner.cerrarSpinner();
  }

  openEndCampaignModal() {
    this.spinner.cargarSpinner();
    // Load departures within campaign dates
    this.territoryService.getWeeklyDepartures().subscribe((departures) => {
      const initDate = new Date(this.activeCampaign.dateInit).getTime();
      const now = new Date().getTime();

      const inRangeDepartures = departures.filter((d) => {
        // weekId usually looks like YYYY-MM-DD or similar
        const dDate = new Date(d.weekId).getTime();
        // Fallback or exact check, depending on how it's formatted
        // If it falls roughly in the campaign time window
        return dDate >= initDate && dDate <= now;
      });

      this.filteredDepartures.set(
        inRangeDepartures.map((d) => ({
          id: d.id || d.weekId,
          date: d.weekId,
          checked: false,
          publishers: undefined,
        })),
      );

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

    this.spinner.cargarSpinner();
    const active = this.campaignService.getCachedCampaign();

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

    if (active) {
      await this.campaignService.endCampaign(
        active.id,
        active.stats,
        this.leftoverInvitations(),
        departuresInfo,
      );
    }

    this.campaignInProgress.set(false);
    this.activeCampaign = null;
    this.showEndCampaignModal.set(false);
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
}
