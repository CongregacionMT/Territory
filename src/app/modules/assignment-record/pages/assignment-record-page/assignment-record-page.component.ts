import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from '@core/models/Card';
import { CardService } from '@core/services/card.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { TerritoriesNumberData } from '@core/models/TerritoryNumberData';

@Component({
    selector: 'app-assignment-record-page',
    templateUrl: './assignment-record-page.component.html',
    styleUrls: ['./assignment-record-page.component.scss'],
    standalone: false
})
export class AssignmentRecordPageComponent implements OnInit {
  routerBreadcrum: any = [];
  territorioMaps: any = [];
  allCardsReceived: any = [];
  allCardsAssigned: any = [];
  cardConfirmation: any;
  formCard: FormGroup;
  territoryNumberOfLocalStorage: TerritoriesNumberData = {} as TerritoriesNumberData;
  appleCount: any;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private territorieDataService: TerritoryDataService,
    private cardService: CardService,
    private router: Router,
    private spinner: SpinnerService,
    private fb: FormBuilder,
  ) {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    // get tarjetas asignadas esta semana
    this.territorieDataService.getCardAssigned().subscribe(card => {
      this.allCardsAssigned = card;
    })
    // get tarjetas a revisión
    this.territorieDataService.getRevisionCardTerritorie().subscribe(card => {
      this.allCardsReceived = card;
      this.cardConfirmation = JSON.parse(JSON.stringify(card));
      this.spinner.cerrarSpinner()
    });
    this.formCard = this.fb.group({
      location: new FormControl("", [Validators.required]),
      driver: new FormControl("", [Validators.required]),
      territory: new FormControl("", [Validators.required]),
      date: new FormControl("", [Validators.required]),
    })
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[2];
    if(!sessionStorage.getItem("territorioMaps")){
      this.spinner.cargarSpinner();
      this.territorieDataService.getMaps()
      .subscribe(map => {
        sessionStorage.setItem("territorioMaps", JSON.stringify(map[0].maps));
        this.territorioMaps = map[0].maps;
        this.spinner.cerrarSpinner();
      });
    } else {
      const storedTerritorioMaps = sessionStorage.getItem("territorioMaps");
      this.territorioMaps = storedTerritorioMaps ? JSON.parse(storedTerritorioMaps) : [];
    }
    if(!sessionStorage.getItem("registerStatisticDataMT") || !sessionStorage.getItem("registerStatisticDataCH")){
      this.spinner.cargarSpinner();
      this.territoryNumberOfLocalStorage = JSON.parse(sessionStorage.getItem('numberTerritory') as string);
      this.territoryNumberOfLocalStorage.mariaTeresa.map((territory) => {
        this.territorieDataService.getCardTerritorieRegisterTable(territory.collection)
        .subscribe((card) => {
          card.map((list: any, index: any) => {
            this.appleCount = 0;
            list.applesData.map((apple: any) => {
              if (apple.checked === true) {
                this.appleCount += 1;
              }
            });
            if (this.appleCount === 0) {
              card.splice(index, 1);
            }
          });
          const storeStatisticdData = sessionStorage.getItem('registerStatisticDataMT');
          const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
          statisticData.push(card);
          sessionStorage.setItem('registerStatisticDataMT', JSON.stringify(statisticData));
          this.spinner.cerrarSpinner();
        })
      });
      this.territoryNumberOfLocalStorage.christophersen.map((territory) => {
        this.territorieDataService.getCardTerritorieRegisterTable(territory.collection)
        .subscribe((card) => {
          card.map((list: any, index: any) => {
            this.appleCount = 0;
            list.applesData.map((apple: any) => {
              if (apple.checked === true) {
                this.appleCount += 1;
              }
            });
            if (this.appleCount === 0) {
              card.splice(index, 1);
            }
          });
          const storeStatisticdData = sessionStorage.getItem('registerStatisticDataCH');
          const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
          statisticData.push(card);
          sessionStorage.setItem('registerStatisticDataCH', JSON.stringify(statisticData));
          this.spinner.cerrarSpinner();
        })
      });
    }
  }
  // Territorios asignados esta semana
  postCardAssigned(){
    this.territorieDataService.postCardAssigned(this.formCard.value);
    this.formCard.reset();
  }
  deleteCardAssigned(card: any){
    this.territorieDataService.deleteCardAssigned(card);
  }
  // Tarjetas en revisión
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
