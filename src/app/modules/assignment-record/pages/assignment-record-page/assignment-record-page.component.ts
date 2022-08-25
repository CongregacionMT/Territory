import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from '@core/models/Card';
import { CardService } from '@core/services/card.service';
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
  cantCardsReceived: Card[] = [
    {
      id: 0,
      numberTerritory: 5,
      location: 'Maria Teresa',
      iframe: `<iframe src="https://www.google.com/maps/d/embed?mid=1GOPjTgnhJgIJWBGZhvgc2eLcCnDkPS8&ehbc=2E312F" width="640" height="480" ></iframe>`,
      driver: 'Jonathan',
      start: '',
      end: '',
      comments: '',
      link: 'tarjeta-mt',
      applesData: [
        {
          name: 'Manzana 1',
          checked: true,
        },
        {
          name: 'Manzana 2',
          checked: true,
        },
        {
          name: 'Manzana 3',
          checked: true,
        },
        {
          name: 'Manzana 4',
          checked: false,
        },
        {
          name: 'Manzana 5',
          checked: false,
        },
      ],
      revision: false
    }
  ];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territorioMapsMockService: TerritorioMapsMockService,
    private cardService: CardService,
    private router: Router
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.territorioMaps = territorioMapsMockService.getMaps();
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[2];
  }

  cardReceived(card: Card){
    console.log("card a revisar: ", card);
    this.cardService.goRevisionCard(card);
  }
}
