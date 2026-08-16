import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Subscription } from 'rxjs';
import { SpinnerService } from '@core/services/spinner.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { DatePipe } from '@angular/common';

import { Card, CardApplesData } from '@core/models/Card';
import { BreadcrumbItem } from '@core/models/Breadcrumb';

@Component({
    selector: 'app-number-territory',
    templateUrl: './number-territory.component.html',
    styleUrls: ['./number-territory.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [BreadcrumbComponent, DatePipe]
})
export class NumberTerritoryComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private activatedRoute = inject(ActivatedRoute);
  private territorieDataService = inject(TerritoryDataService);
  private router = inject(Router);
  private spinner = inject(SpinnerService);

  routerBreadcrum: BreadcrumbItem[] = [];
  path: string = "";
  dataList: Card[] = [];
  numberTerritory: number = 0;
  appleCount: number = 0;
  cardSubscription: Subscription;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
      const routerBreadcrumMockService = this.routerBreadcrumMockService;

      this.spinner.cargarSpinner();
      this.cardSubscription = Subscription.EMPTY;
      const breadcrumbs = routerBreadcrumMockService.getBreadcrum();
      this.routerBreadcrum = breadcrumbs[6];
    }

  ngOnInit(): void {
    // RECIBIR LA DATA
    this.path = this.activatedRoute.snapshot.params['collection'];
    this.territorieDataService.getCardTerritorie(this.path).subscribe({
      next: card => {
        this.dataList = card;
        this.numberTerritory = card[0].territoryNumber ?? 0;
        this.dataList.map((list: Card, index: number) => {
          this.appleCount = 0;
          list.applesData.map((apple: CardApplesData) => {
            if(apple.checked === true){
              this.appleCount+=1
            }
          });
          if(this.appleCount === 0){
            this.dataList.splice(index, 1);
          }
        })
        this.spinner.cerrarSpinner();
        this.dataList.map((list) => {
          if (list.creation && typeof list.creation === 'object' && 'seconds' in list.creation) {
             let date = new Date(list.creation.seconds * 1000);
             list.creation = date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear();
          }
        });
      }
    });
  }
  ngOnDestroy(): void {
  }
}
