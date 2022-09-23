import { Component, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { TerritoriesMTMockService } from '@shared/mocks/territories-mtmock.service';
import { Subject } from 'rxjs';
@Component({
  selector: 'app-maria-teresa-assignment',
  templateUrl: './maria-teresa-assignment.component.html',
  styleUrls: ['./maria-teresa-assignment.component.scss'],
})
export class MariaTeresaAssignmentComponent implements OnInit {
  routerBreadcrum: any = [];
  territoriesMT: any[] = [];
  dataListFull: any[] = [];
  appleCount: any;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoriesMTMockService: TerritoriesMTMockService,
    private territoryDataService: TerritoryDataService,
    private territorieDataService: TerritoryDataService
  ) {
    this.territoriesMT = territoriesMTMockService.getTerritories();
  }
  
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum = this.routerBreadcrum[3];
    // RECIBIR LA DATA
    this.territoriesMT.map((territory) => {
      this.territorieDataService.getCardTerritorie(territory.collection).subscribe({
        next: card => {
          card.map((list: any, index: any) => {
            this.appleCount = 0;
            list.applesData.map((apple: any) => {
              if(apple.checked === true){
                this.appleCount+=1
              }
            });
            if(this.appleCount === 0){
              card.splice(index, 1);
            }
          });
          this.dataListFull.push(card);
        }
      })
    });
    console.log("full: ", this.dataListFull);
  }

  pathMT(){
    this.territoryDataService.pathNumberTerritory = 0;
  }
}
