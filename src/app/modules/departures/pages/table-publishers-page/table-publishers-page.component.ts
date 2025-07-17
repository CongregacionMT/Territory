import { Component, OnInit } from '@angular/core';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { TerritoryDataService } from '../../../../core/services/territory-data.service';

@Component({
    selector: 'app-table-publishers-page',
    templateUrl: './table-publishers-page.component.html',
    styleUrls: ['./table-publishers-page.component.scss'],
    standalone: false
})
export class TablePublishersPageComponent implements OnInit {
  routerBreadcrum: any = [];
  groupList: any[] = [];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoriyDataService: TerritoryDataService,
    private spinner: SpinnerService,
  ){
    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }

  ngOnInit(): void {
    this.spinner
    this.routerBreadcrum = this.routerBreadcrum[12];
    this.territoriyDataService.getGroupList().subscribe({
      next: (data) => {
        this.groupList = data;
        this.spinner.cerrarSpinner();
      }
    });
  }

}
