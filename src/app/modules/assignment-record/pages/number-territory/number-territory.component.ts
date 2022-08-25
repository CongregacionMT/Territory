import { Component, OnInit } from '@angular/core';
import { DataNumberTerritoryService } from '@shared/mocks/data-number-territory.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-number-territory',
  templateUrl: './number-territory.component.html',
  styleUrls: ['./number-territory.component.scss'],
})
export class NumberTerritoryComponent implements OnInit {
  routerBreadcrum: any = [];
  dataList: any[] = [];
  dtOptions: DataTables.Settings = {};
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private dataNumberTerritoryService: DataNumberTerritoryService,
    private router: Router
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    if(this.router.url === '/registro-territorios/maria-teresa/territorio'){
      this.routerBreadcrum = this.routerBreadcrum[6];
      this.dataList = dataNumberTerritoryService.getDataListMT1();
    } else if(this.router.url === '/registro-territorios/christophersen/territorio'){
      this.routerBreadcrum = this.routerBreadcrum[7];
      this.dataList = dataNumberTerritoryService.getDataListC1();
    }
  }

  ngOnInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      paging: false,
      scrollY: '310',
      language: {
        url: '//cdn.datatables.net/plug-ins/1.12.1/i18n/es-AR.json',
      },
      lengthChange: true,
      ordering: true,
      autoWidth: true,
      stateSave: true,
      responsive: true,
    };
  }
}
