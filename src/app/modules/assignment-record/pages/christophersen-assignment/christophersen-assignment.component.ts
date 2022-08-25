import { Component, OnInit } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { TerritoriesChristMockService } from '@shared/mocks/territories-christ-mock.service';

@Component({
  selector: 'app-christophersen-assignment',
  templateUrl: './christophersen-assignment.component.html',
  styleUrls: ['./christophersen-assignment.component.scss'],
})
export class ChristophersenAssignmentComponent implements OnInit {
  routerBreadcrum: any = [];
  territoriesC: any[] = [];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoriesChristMockService: TerritoriesChristMockService
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.territoriesC = this.territoriesChristMockService.getTerritories();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[4];
  }
}
