import { Component, OnInit } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { TerritorioMapsMockService } from '@shared/mocks/territorio-maps-mock.service';

@Component({
  selector: 'app-assignment-record-page',
  templateUrl: './assignment-record-page.component.html',
  styleUrls: ['./assignment-record-page.component.scss'],
})
export class AssignmentRecordPageComponent implements OnInit {
  routerBreadcrum: any = [];
  territorioMaps: any = [];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territorioMapsMockService: TerritorioMapsMockService
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.territorioMaps = territorioMapsMockService.getMaps();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[2];
  }
}
