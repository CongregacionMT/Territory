import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { DatePipe } from '@angular/common';
import { parseFirebaseDate } from '@shared/utils/date-utils';
import { Card } from '@core/models/Card';

@Component({
  selector: 'app-number-territory',
  templateUrl: './number-territory.component.html',
  styleUrls: ['./number-territory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
})
export class NumberTerritoryComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private activatedRoute = inject(ActivatedRoute);
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  path: string = '';
  dataList = signal<Card[]>([]);
  numberTerritory = signal<number>(0);

  constructor() {
    this.spinner.cargarSpinner();
  }

  ngOnInit(): void {
    // RECIBIR LA DATA
    this.path = this.activatedRoute.snapshot.params['collection'] as string;
    this.territorieDataService
      .getCardTerritorie(this.path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (card: Card[]) => {
          // Filtrar las tarjetas que no tienen ninguna manzana seleccionada y que tengan array de manzanas
          const filtered = card.filter((c: Card) => c.applesData?.some((apple) => apple.checked));

          if (filtered.length > 0) {
            this.numberTerritory.set(filtered[0].territoryNumber ?? 0);
          } else {
            // Si el array filtrado está vacío, intenta tomar el número de la lista original
            this.numberTerritory.set(card.length > 0 ? (card[0].territoryNumber ?? 0) : 0);
          }

          filtered.forEach((list) => {
            list.creation = parseFirebaseDate(list.creation);
            list.start = parseFirebaseDate(list.start);
            list.end = parseFirebaseDate(list.end);
          });

          this.dataList.set(filtered);

          this.spinner.cerrarSpinner();
        },
      });
  }
}
