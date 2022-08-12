import { Component, OnInit } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-card-territory',
  templateUrl: './card-territory.component.html',
  styleUrls: ['./card-territory.component.scss']
})
export class CardTerritoryComponent implements OnInit {
  routerBreadcrum: any = [];
  constructor(private routerBreadcrumMockService: RouterBreadcrumMockService) { 
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[9];
  }

}
