import { Component, OnInit, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { CardService } from '@core/services/card.service';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { LocalityData } from '@core/models/LocalityData';
import { MapData } from '@core/models/MapData';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { RouterLink } from '@angular/router';
import { CardSComponent } from '../../../../shared/components/card-s/card-s.component';
import { environment } from '@environments/environment';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-territory-page',
    templateUrl: './territory-page.component.html',
    styleUrls: ['./territory-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [CardXlComponent, RouterLink, CardSComponent]
})
export class TerritoryPageComponent implements OnInit {
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private destroyRef = inject(DestroyRef);
  cardService = inject(CardService);
  territorioMaps: CardButtonsData[] = [];
  
  // NUEVO: Datos agrupados por localidad
  localitiesWithTerritories: LocalityData[] = [];
  
  isAdmin: boolean = false;
  isDriver: boolean = false;
  congregationName: string = environment.congregationName;
  localities: any[] = environment.localities || [];constructor() {
  }

  ngOnInit(): void {
    
    if(localStorage.getItem("tokenAdmin")){
      this.isAdmin = true;
    } else if(localStorage.getItem("tokenConductor")){
      this.isDriver = true;
    }
    
    // Cargar mapas de localidades desde Firebase (ya vienen con links correctos)
    if(!sessionStorage.getItem("territorioMaps")){
      this.spinner.cargarSpinner();
      this.territorieDataService.getMaps().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((map: MapData[]) => {
        // Los mapas vienen de Firebase con el link correcto (mariaTeresa, christophersen, etc.)
        if (map.length > 0) {
            const maps = map[0].maps;
            sessionStorage.setItem("territorioMaps", JSON.stringify(maps));
            this.territorioMaps = maps;
        }
        this.spinner.cerrarSpinner();
      });
    } else {
      const storedTerritorioMaps = sessionStorage.getItem("territorioMaps");
      this.territorioMaps = storedTerritorioMaps ? JSON.parse(storedTerritorioMaps) : [];
    }

    // Cargar y agrupar territorios por localidad
    const storedNumberTerritory = sessionStorage.getItem("numberTerritory");
    const numberTerritory = storedNumberTerritory ? JSON.parse(storedNumberTerritory) : {};
    
    this.groupTerritoriesByLocality(numberTerritory);
  }
  
  /**
   * Agrupa los territorios por localidad basándose en el prefijo de la colección
   */
  groupTerritoriesByLocality(numberTerritory: any): void {
    this.localitiesWithTerritories = this.localities
      .filter(locality => locality.hasNumberedTerritories)
      .map(locality => {
        // Obtener territorios específicos de esta localidad usando su key
        const territories = numberTerritory[locality.key] || [];
        
        return {
          key: locality.key,
          name: locality.name,
          territoryPrefix: locality.territoryPrefix,
          territories: territories,
          hasNumberedTerritories: locality.hasNumberedTerritories
        } as LocalityData;
      })
      .filter(locality => locality.territories.length > 0);
  }
}
