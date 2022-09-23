import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from '@core/models/Card';
import { CardService } from '@core/services/card.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
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
  allCardsReceived: any = [];
  cardConfirmation: any;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territorioMapsMockService: TerritorioMapsMockService,
    private territorieDataService: TerritoryDataService,
    private cardService: CardService,
    private router: Router,
    private spinner: SpinnerService
  ) {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.territorioMaps = territorioMapsMockService.getMaps();
    this.territorieDataService.getRevisionCardTerritorie().subscribe(card => {
      this.allCardsReceived = card;
      this.cardConfirmation = JSON.parse(JSON.stringify(card));
      this.spinner.cerrarSpinner()
    });
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[2];
  }
  cardReceived(card: Card){
    this.cardService.goRevisionCard(card);
  }
  cardConfirmationDelete(card: any){    
    this.cardConfirmation = card;
  }
  cardDelete(){
    this.territorieDataService.deleteCardTerritorie(this.cardConfirmation);
  }
}
