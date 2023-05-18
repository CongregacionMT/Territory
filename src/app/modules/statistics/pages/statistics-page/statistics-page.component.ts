import { Component, OnInit } from '@angular/core';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { Subject } from 'rxjs';
import { TerritoriesMTMockService } from '../../../../shared/mocks/territories-mtmock.service';
@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.component.html',
  styleUrls: ['./statistics-page.component.scss'],
})
export class StatisticsPageComponent implements OnInit {
  routerBreadcrum: any = [];
  territoriesMT: any[] = [];
  dataListFull: any[] = [];
  datalistFilter: any[] = [];
  dataStadistics: any[] = [];
  appleCount: any;
  dtTrigger: Subject<any> = new Subject<any>();
  dtOptions: DataTables.Settings = {};
  path: any;
  order: any = 1;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoriesMTMockService: TerritoriesMTMockService,
    private territorieDataService: TerritoryDataService,
    private spinner: SpinnerService,
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.spinner.cargarSpinner();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[10];
    this.territoriesMT = this.territoriesMTMockService.getTerritories();
    // tabla
    this.dtOptions = {
      paging: false,
      orderMulti: true,
      pageLength: 100,
      search: false,
      // language: {
      //   url: '//cdn.datatables.net/plug-ins/1.12.1/i18n/es-AR.json',
      // },
      ordering: true,
      stateSave: true
    };
    // RECIBIR LA DATA
    this.territoriesMT.map((territory) => {
      this.territorieDataService
        .getCardTerritorie(territory.collection)
        .subscribe({
          next: (card) => {
            this.dataListFull.push(JSON.parse(JSON.stringify(card)));
            card.map((list: any, index: any) => {
              this.appleCount = 0;
              list.applesData.map((apple: any) => {
                if (apple.checked === true) {
                  this.appleCount += 1;
                }
              });
              if (this.appleCount === 0) {
                card.splice(index, 1);
              }
            });
            this.dtTrigger.next("");
            this.datalistFilter.push(JSON.parse(JSON.stringify(card)));
            this.spinner.cerrarSpinner();
            this.sortTable("Territorio");
            console.log("DATA: ", this.dataListFull[0]);
          },
        });
    });
  }
  sortTable(prop: string) {
    console.log("prop", prop);

    this.path = prop;
    console.log("path", this.path);

    this.order = this.order * (-1);
    console.log("order", this.order);
    return false;
  }

 getIcon(prop:string): string{
   //Yo uso iconos font-awesome de ahí la nomenclatura
    var iconClass = "fa fa-sort";

     if(this.path.indexOf(prop) != -1)
     {
      iconClass = this.order===-1 ? 'fa fa-sort-down' : 'fa fa-sort-up';
     }

     return iconClass;
  }
  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }
}
