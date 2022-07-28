import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TerritoryRoutingModule } from './territory-routing.module';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';
import { CardXlComponent } from '@shared/components/card-xl/card-xl.component';
import { CardSComponent } from '@shared/components/card-s/card-s.component';
import { MariaTeresaComponent } from './pages/maria-teresa/maria-teresa.component';
import { CardTerritoryComponent } from './pages/card-territory/card-territory.component';

@NgModule({
  declarations: [
    TerritoryPageComponent,
    CardSComponent,
    CardXlComponent,
    MariaTeresaComponent,
    CardTerritoryComponent
  ],
  imports: [
    CommonModule,
    TerritoryRoutingModule
  ]
})
export class TerritoryModule { }
