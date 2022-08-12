import { Component, OnInit } from '@angular/core';
import { DataNumberTerritoryService } from '@shared/mocks/data-number-territory.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-number-territory',
  templateUrl: './number-territory.component.html',
  styleUrls: ['./number-territory.component.scss']
})
export class NumberTerritoryComponent implements OnInit {
  routerBreadcrum: any = [];
  dataList: any[] = [];
  dtOptions: DataTables.Settings = {};
  constructor(private routerBreadcrumMockService: RouterBreadcrumMockService, private dataNumberTerritoryService: DataNumberTerritoryService) { 
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.dataList = dataNumberTerritoryService.getDataListMT1();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[6];
    this.dtOptions = {
      pagingType: 'full_numbers',
      paging: false,
      scrollY: "310",
      language: {
        url: '//cdn.datatables.net/plug-ins/1.12.1/i18n/es-AR.json'
      },
      lengthChange: true,
      ordering: true,
      autoWidth: true,
      stateSave: true,
      responsive: true
    }
  }

}
