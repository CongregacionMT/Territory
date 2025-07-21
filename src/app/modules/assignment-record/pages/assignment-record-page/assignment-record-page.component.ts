import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Card } from '@core/models/Card';
import { CardService } from '@core/services/card.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { TerritoriesNumberData } from '@core/models/TerritoryNumberData';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-assignment-record-page',
    templateUrl: './assignment-record-page.component.html',
    styleUrls: ['./assignment-record-page.component.scss'],
    imports: [BreadcrumbComponent, CardXlComponent, RouterLink, ReactiveFormsModule, DatePipe]
})
export class AssignmentRecordPageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territorieDataService = inject(TerritoryDataService);
  private cardService = inject(CardService);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private fb = inject(FormBuilder);

  routerBreadcrum: any = [];
  territorioMaps: any = [];
  allCardsReceived: any = [];
  allCardsAssigned: any = [];
  cardConfirmation: any;
  formCard: FormGroup;
  territoryNumberOfLocalStorage: TerritoriesNumberData = {} as TerritoriesNumberData;
  appleCount: any;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

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
    if(!sessionStorage.getItem("registerStatisticDataW") || !sessionStorage.getItem("registerStatisticDataR")){
      this.spinner.cargarSpinner();
      this.territoryNumberOfLocalStorage = JSON.parse(sessionStorage.getItem('numberTerritory') as string);
      this.territoryNumberOfLocalStorage.wheelwright.map((territory) => {
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
          const storeStatisticdData = sessionStorage.getItem('registerStatisticDataW');
          const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
          statisticData.push(card);
          sessionStorage.setItem('registerStatisticDataW', JSON.stringify(statisticData));
          this.spinner.cerrarSpinner();
        })
      });
      this.territoryNumberOfLocalStorage.rural.map((territory) => {
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
          const storeStatisticdData = sessionStorage.getItem('registerStatisticDataR');
          const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
          statisticData.push(card);
          sessionStorage.setItem('registerStatisticDataR', JSON.stringify(statisticData));
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
