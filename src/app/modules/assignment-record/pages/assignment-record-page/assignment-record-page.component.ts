import { Component, OnInit, inject, ChangeDetectorRef, signal, computed } from '@angular/core';
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
  private cdRef = inject(ChangeDetectorRef);

  // Signals para el estado del componente
  routerBreadcrum = signal<any[]>([]);
  territorioMaps = signal<any[]>([]);
  allCardsReceived = signal<any[]>([]);
  allCardsAssigned = signal<any[]>([]);
  cardConfirmation = signal<any>(null);
  formCard = signal<FormGroup>(this.createFormCard());
  territoryNumberOfLocalStorage = signal<TerritoriesNumberData>({} as TerritoriesNumberData);
  appleCount = signal<any>(0);

  // Computed signals (opcional, para valores derivados)
  hasCardsReceived = computed(() => this.allCardsReceived().length > 0);
  hasCardsAssigned = computed(() => this.allCardsAssigned().length > 0);
  hasTerritoryMaps = computed(() => this.territorioMaps().length > 0);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.spinner.cargarSpinner();
    this.routerBreadcrum.set(routerBreadcrumMockService.getBreadcrum());

    // get tarjetas asignadas esta semana
    this.territorieDataService.getCardAssigned().subscribe(card => {
      this.allCardsAssigned.set(card);
    });

    // get tarjetas a revisión
    this.territorieDataService.getRevisionCardTerritorie().subscribe(card => {
      this.allCardsReceived.set(card);
      this.cardConfirmation.set(JSON.parse(JSON.stringify(card)));
      this.spinner.cerrarSpinner();
    });
  }

  private createFormCard(): FormGroup {
    return this.fb.group({
      location: new FormControl("", [Validators.required]),
      driver: new FormControl("", [Validators.required]),
      territory: new FormControl("", [Validators.required]),
      date: new FormControl("", [Validators.required]),
    });
  }

  ngOnInit(): void {
    // Actualizar el signal con el valor del índice 2
    const breadcrumData = this.routerBreadcrum();
    this.routerBreadcrum.set(breadcrumData[2]);

    if(!sessionStorage.getItem("territorioMaps")){
      this.spinner.cargarSpinner();
      this.territorieDataService.getMaps()
      .subscribe(map => {
        sessionStorage.setItem("territorioMaps", JSON.stringify(map[0].maps));
        this.territorioMaps.set(map[0].maps);
        this.spinner.cerrarSpinner();
      });
    } else {
      const storedTerritorioMaps = sessionStorage.getItem("territorioMaps");
      this.territorioMaps.set(storedTerritorioMaps ? JSON.parse(storedTerritorioMaps) : []);
    }

    if(!sessionStorage.getItem("registerStatisticDataW")){
      this.spinner.cargarSpinner();
      const territoryData = JSON.parse(sessionStorage.getItem('numberTerritory') as string);
      this.territoryNumberOfLocalStorage.set(territoryData);

      this.territoryNumberOfLocalStorage().wheelwright.map((territory) => {
        this.territorieDataService.getCardTerritorieRegisterTable(territory.collection)
        .subscribe((card) => {
          card.map((list: any, index: any) => {
            this.appleCount.set(0);
            list.applesData.map((apple: any) => {
              if (apple.checked === true) {
                this.appleCount.update(count => count + 1);
              }
            });
            if (this.appleCount() === 0) {
              card.splice(index, 1);
            }
          });
          const storeStatisticdData = sessionStorage.getItem('registerStatisticDataW');
          console.log("storeStatisticdData", storeStatisticdData);
          console.log("card", card);

          const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
          console.log("statisticData", statisticData);
          statisticData.push(card);
          sessionStorage.setItem('registerStatisticDataW', JSON.stringify(statisticData));
          this.spinner.cerrarSpinner();
        });
      });

      // this.territoryNumberOfLocalStorage().rural.map((territory) => {
      //   this.territorieDataService.getCardTerritorieRegisterTable(territory.collection)
      //   .subscribe((card) => {
      //     card.map((list: any, index: any) => {
      //       this.appleCount.set(0);
      //       list.applesData.map((apple: any) => {
      //         if (apple.checked === true) {
      //           this.appleCount.update(count => count + 1);
      //         }
      //       });
      //       if (this.appleCount() === 0) {
      //         card.splice(index, 1);
      //       }
      //     });
      //     const storeStatisticdData = sessionStorage.getItem('registerStatisticDataR');
      //     const statisticData = storeStatisticdData ? JSON.parse(storeStatisticdData) : [];
      //     statisticData.push(card);
      //     sessionStorage.setItem('registerStatisticDataR', JSON.stringify(statisticData));
      //     this.spinner.cerrarSpinner();
      //   });
      // });
    }
  }

  // Territorios asignados esta semana
  postCardAssigned(){
    this.territorieDataService.postCardAssigned(this.formCard().value);
    this.formCard().reset();
  }

  deleteCardAssigned(card: any){
    this.territorieDataService.deleteCardAssigned(card);
  }

  // Tarjetas en revisión
  cardReceived(card: Card){
    this.cardService.goRevisionCard(card);
  }

  cardConfirmationDelete(card: any){
    this.cardConfirmation.set(card);
    this.cdRef.detectChanges(); // Fuerza la actualización
  }

  cardDelete(){
    this.territorieDataService.deleteCardTerritorie(this.cardConfirmation());
  }
}
