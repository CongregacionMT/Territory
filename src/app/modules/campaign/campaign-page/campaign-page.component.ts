import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import {
  CampaignLocalityGroup,
  groupStatsByLocality,
  filterDeparturesByCampaignDates,
  parseFirebaseDate,
} from '@shared/utils/campaign.utils';

import { ProgressBarComponent } from '@shared/components/progress-bar/progress-bar.component';
import { StartCampaignModalComponent } from '../components/start-campaign-modal/start-campaign-modal.component';
import {
  EndCampaignModalComponent,
  EndCampaignData,
} from '../components/end-campaign-modal/end-campaign-modal.component';
import { CampaignData } from '../campaign-detail/campaign-detail.component';

@Component({
  selector: 'app-campaign-page',
  imports: [
    FormsModule,
    NgClass,
    ProgressBarComponent,
    StartCampaignModalComponent,
    EndCampaignModalComponent,
  ],
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

  // End Campaign State passed to Modal
  initialEndDate = signal('');
  filteredDepartures = signal<import('@shared/utils/campaign.utils').DepartureInfo[]>([]);

  activeCampaign = signal<CampaignData | null>(null);

  territoriosPorLocalidad = signal<CampaignLocalityGroup[]>([]);
  campaignHistory = signal<{ nombre: string; descripcion: string; fecha: string; id: string }[]>(
    [],
  );
  statsGlobal = signal<{ percent: number; total: number; salidas?: number; done: number } | null>(
    null,
  );

  private campaignService = inject(CampaignService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private territoryService = inject(TerritoryDataService);
  private cdr = inject(ChangeDetectorRef);

  startModal = viewChild.required(StartCampaignModalComponent);
  endModal = viewChild.required(EndCampaignModalComponent);

  ngOnInit(): void {
    void this.loadData();
  }

  async loadData(): Promise<void> {
    this.spinner.cargarSpinner();
    const active = await this.campaignService.getActiveCampaign();
    this.activeCampaign.set(active);

    if (active) {
      this.campaignInProgress.set(true);
      localStorage.setItem('activeCampaign', JSON.stringify(active));
      const stats = (await this.campaignService.getCampaignStats(active.id || '')) as Record<
        string,
        { percent: number; total: number; salidas?: number; done: number }
      >;
      this.statsGlobal.set(stats['global'] || null);
      this.territoriosPorLocalidad.set(groupStatsByLocality(stats));
    }

    const campaigns = await this.campaignService.getInactiveCampaigns();
    this.campaignHistory.set(
      campaigns.map((c) => ({
        id: c.id || '',
        nombre: c.name,
        descripcion: c.description,
        fecha: c.dateEnd
          ? new Date((c.dateEnd as { seconds: number }).seconds * 1000).toLocaleDateString()
          : '',
      })),
    );
    this.spinner.cerrarSpinner();
  }

  onNameChange(value: string): void {
    this.campaignName.set(value);
    this.nameInvalid.set(value.length <= 3);
  }

  onDateChange(value: string): void {
    this.campaignEnd.set(value);
    this.dateInvalid.set(!this.campaignEnd());
  }

  openStartModal(): void {
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

    this.startModal().open();
  }

  async confirmStartCampaign(): Promise<void> {
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

    this.activeCampaign.set(campaign);
    this.campaignInProgress.set(true);
    this.startingCampaign.set(false);

    const stats = (await this.campaignService.getCampaignStats(campaign.id || '')) as Record<
      string,
      { percent: number; total: number; salidas?: number; done: number }
    >;
    this.statsGlobal.set(stats['global'] || null);
    this.territoriosPorLocalidad.set(groupStatsByLocality(stats));
  }

  async openEndCampaignModal(): Promise<void> {
    this.spinner.cargarSpinner();

    let active = this.activeCampaign();
    if (!active) {
      active = await this.campaignService.getActiveCampaign();
      this.activeCampaign.set(active);
    }

    if (!active) {
      this.spinner.cerrarSpinner();
      alert('No se encontró una campaña activa. Por favor, recargá la página.');
      return;
    }

    if (active.dateEnd) {
      const parsedD = parseFirebaseDate(active.dateEnd);
      if (parsedD) {
        const iso = parsedD.toISOString().split('T')[0];
        this.initialEndDate.set(iso);
      }
    }

    try {
      const departures = await firstValueFrom(this.territoryService.getWeeklyDepartures());
      const filtered = filterDeparturesByCampaignDates(
        departures,
        active.dateInit || '',
        active.dateEnd || '',
      );
      this.filteredDepartures.set(filtered);

      this.spinner.cerrarSpinner();
      this.endModal().open();
    } catch (err) {
      console.error(err);
      this.spinner.cerrarSpinner();
      alert('Error cargando los datos necesarios para finalizar la campaña.');
    }
  }

  async handleEndCampaign(data: EndCampaignData): Promise<void> {
    const active = (this.campaignService.getCachedCampaign() ||
      this.activeCampaign()) as CampaignData | null;
    if (!active) return;

    this.finishingCampaign.set(true);
    this.campaignProgress.set(0);
    this.campaignProgressTotal.set(0);
    this.campaignError.set(null);

    const finishedCampaignId = active.id;

    try {
      await this.campaignService.endCampaign(
        active.id || '',
        active.stats || {},
        data.leftoverInvitations,
        data.departuresInfo,
        data.missingInvitations,
        data.finalComments,
        Timestamp.fromDate(new Date(data.finalEndDate + 'T23:59:59')),
        (current: number, total: number) => {
          this.campaignProgress.set(current);
          this.campaignProgressTotal.set(total);
          this.cdr.markForCheck();
        },
      );

      this.campaignInProgress.set(false);
      this.activeCampaign.set(null);
      this.finishingCampaign.set(false);
      this.cdr.markForCheck();

      void this.router.navigate(['/campaign', finishedCampaignId]);
    } catch (err: unknown) {
      console.error('[CampaignPage] Error finalizando campaña:', err);
      this.finishingCampaign.set(false);
      this.campaignError.set(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al finalizar. Recargá la página e intentá de nuevo.',
      );
      this.cdr.markForCheck();
    }
  }

  get daysLeft(): number {
    const active = this.activeCampaign();
    if (!active?.dateEnd) return 0;
    const end = active.dateEnd;
    let endDate: Date;
    const parsedEnd = parseFirebaseDate(end);
    if (parsedEnd) {
      endDate = parsedEnd;
    } else {
      endDate = new Date();
    }
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  goToCampaignDetail(campaignId: string): void {
    void this.router.navigate(['/campaign', campaignId]);
  }
}
