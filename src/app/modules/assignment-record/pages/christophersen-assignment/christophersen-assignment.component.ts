import { Component, OnInit } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
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
  dataListFull: any[] = [];
  appleCount: any;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territoriesChristMockService: TerritoriesChristMockService,
    private territorieDataService: TerritoryDataService
  ) {
    this.territoriesC = this.territoriesChristMockService.getTerritories();
  }
  
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum = this.routerBreadcrum[4];
    // RECIBIR LA DATA
    this.territoriesC.map((territory) => {
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

  pathCH(){
    this.territorieDataService.pathNumberTerritory = 1;
  }
}
