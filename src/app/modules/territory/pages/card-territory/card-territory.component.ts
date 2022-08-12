import { Component, OnInit } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-card-territory',
  templateUrl: './card-territory.component.html',
  styleUrls: ['./card-territory.component.scss']
})
export class CardTerritoryComponent implements OnInit {
  routerBreadcrum: any = [];
  applesData: any = [
    {
      name: "Manzana 1",
      checked: true
    },
    {
      name: "Manzana 2",
      checked: true
    },
    {
      name: "Manzana 3",
      checked: false
    },
    {
      name: "Manzana 4",
      checked: false
    },
    {
      name: "Manzana 5",
      checked: false
    },
  ];
  constructor(private routerBreadcrumMockService: RouterBreadcrumMockService) { 
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[9];
  }

}
