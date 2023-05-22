import { Component, OnInit } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { GroupsMockService } from '@shared/mocks/groups-mock.service';

@Component({
  selector: 'app-departure-page',
  templateUrl: './departure-page.component.html',
  styleUrls: ['./departure-page.component.scss']
})
export class DeparturePageComponent implements OnInit{
  isAdmin: boolean = false;
  routerBreadcrum: any = [];
  groupList: any[] = []
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private groupsMockService: GroupsMockService
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.groupList = groupsMockService.getGroups();
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[1];
  }
}
