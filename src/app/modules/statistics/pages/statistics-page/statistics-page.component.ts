import { Component, inject, input, effect, ChangeDetectionStrategy, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { environment } from '@environments/environment';
import { StatisticsFeatureService } from '../../services/statistics-feature.service';
import { StatCardComponent } from '../../components/stat-card/stat-card.component';
import { LegendItemComponent } from '../../components/legend-item/legend-item.component';
import { StatisticsTableComponent } from '../../components/statistics-table/statistics-table.component';

@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.component.html',
  styleUrls: ['./statistics-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [StatisticsFeatureService],
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    StatCardComponent,
    LegendItemComponent,
    StatisticsTableComponent,
  ],
  standalone: true,
})
export class StatisticsPageComponent {
  private statsService = inject(StatisticsFeatureService);

  // Router input binding replaces ActivatedRoute subscription
  readonly locality = input.required<string>();

  // State from service
  readonly loadingData = this.statsService.loadingData;
  readonly dataListFull = this.statsService.dataListFull;
  readonly summaryStats = this.statsService.summaryStats;
  readonly timeRange = this.statsService.timeRange;
  readonly personalTerritories = this.statsService.personalTerritories;

  // Local state for table sorting
  readonly path = input<string>('end');
  order = 1;
  currentSortPath = 'end';

  readonly nameTitleTerritory = computed(() => {
    const loc = this.locality();
    const localityConfig = environment.localities?.find((l) => l.key === loc);
    return localityConfig ? localityConfig.name : this.capitalize(loc);
  });

  green = new FormControl(28, { nonNullable: true });
  blue = new FormControl(42, { nonNullable: true });
  yellow = new FormControl(56, { nonNullable: true });
  red = new FormControl(57, { nonNullable: true });

  constructor() {
    effect(() => {
      // Trigger load when locality changes
      void this.statsService.loadLocalityData(this.locality());
    });
  }

  setTimeRange(months: number): void {
    void this.statsService.setTimeRange(months);
  }

  refreshData(): void {
    void this.statsService.loadLocalityData(this.locality(), true);
  }

  onSortChanged(prop: string): void {
    if (this.currentSortPath === prop) {
      this.order = this.order * -1;
    } else {
      this.currentSortPath = prop;
      this.order = 1;
    }
  }

  private capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
}
