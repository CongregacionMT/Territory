import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Subscription } from 'rxjs';
import { SpinnerService } from '@core/services/spinner.service';
import { DatePipe } from '@angular/common';

import { Card, CardApplesData } from '@core/models/Card';

@Component({
  selector: 'app-number-territory',
  templateUrl: './number-territory.component.html',
  styleUrls: ['./number-territory.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DatePipe],
})
export class NumberTerritoryComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private activatedRoute = inject(ActivatedRoute);
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  path: string = '';
  dataList: Card[] = [];
  numberTerritory: number = 0;
  appleCount: number = 0;
  cardSubscription: Subscription;
  constructor() {
    this.spinner.cargarSpinner();
    this.cardSubscription = Subscription.EMPTY;
  }

  ngOnInit(): void {
    // RECIBIR LA DATA
    this.path = this.activatedRoute.snapshot.params['collection'];
    this.territorieDataService
      .getCardTerritorie(this.path)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (card) => {
          this.dataList = card;
          this.numberTerritory = card[0].territoryNumber ?? 0;
          this.dataList.map((list: Card, index: number) => {
            this.appleCount = 0;
            list.applesData.map((apple: CardApplesData) => {
              if (apple.checked === true) {
                this.appleCount += 1;
              }
            });
            if (this.appleCount === 0) {
              this.dataList.splice(index, 1);
            }
          });
          this.spinner.cerrarSpinner();
          this.dataList.map((list) => {
            if (list.creation && typeof list.creation === 'object' && 'seconds' in list.creation) {
              let date = new Date((list.creation as any).seconds * 1000);
              list.creation =
                date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear();
            }
          });
        },
      });
  }
}
