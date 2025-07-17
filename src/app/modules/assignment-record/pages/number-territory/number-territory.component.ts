import { Component, OnInit, inject } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Subject, Subscription } from 'rxjs';
import { SpinnerService } from '@core/services/spinner.service';
import { Config } from 'datatables.net';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { DataTablesModule } from 'angular-datatables';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-number-territory',
    templateUrl: './number-territory.component.html',
    styleUrls: ['./number-territory.component.scss'],
    imports: [BreadcrumbComponent, DataTablesModule, DatePipe]
})
export class NumberTerritoryComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private activatedRoute = inject(ActivatedRoute);
  private territorieDataService = inject(TerritoryDataService);
  private router = inject(Router);
  private spinner = inject(SpinnerService);

  routerBreadcrum: any = [];
  path: any;
  dataList: any[] = [];
  dtTrigger: Subject<any> = new Subject<any>();
  dtOptions: Config = {};
  numberTerritory: number = 0;
  appleCount: any;
  cardSubscription: Subscription;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
      const routerBreadcrumMockService = this.routerBreadcrumMockService;

      this.spinner.cargarSpinner();
      this.cardSubscription = Subscription.EMPTY;
      this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
      this.routerBreadcrum = this.routerBreadcrum[6];
    }

  ngOnInit(): void {
    // tabla
    this.dtOptions = {
      pagingType: 'full_numbers',
      paging: false,
      scrollY: '310',
      language: {
        url: '//cdn.datatables.net/plug-ins/1.12.1/i18n/es-AR.json',
      },
      lengthChange: true,
      ordering: true,
      stateSave: true
    };
    // RECIBIR LA DATA
    this.path = this.activatedRoute.snapshot.params['collection'];
    this.territorieDataService.getCardTerritorie(this.path).subscribe({
      next: card => {
        this.dataList = card;
        this.numberTerritory = card[0].numberTerritory
        this.dtTrigger.next("");
        this.dataList.map((list: any, index: any) => {
          this.appleCount = 0;
          list.applesData.map((apple: any) => {
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
          let date = new Date(list.creation.seconds * 1000);
          list.creation = date.getDate()+"-"+(date.getMonth()+1)+"-"+date.getFullYear();
        });
      }
    });
  }
  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }
}
